-- ============================================================
-- FC 26 Live Editor - Season Review Export (v12 Ultimate Edition)
-- ============================================================

local MEMORY = require 'imports/core/memory'
require 'imports/core/common'
require 'imports/other/helpers'
require 'imports/services/enums'

local CFG = {
    TOP_N               = 8,
    MAIN_LEAGUES_ONLY   = true,
    FREE_AGENTS_TEAMID  = 111592,
    OUT_FILE            = "fc26_season_export.txt",
    NOTES_FILE          = "fc26_manual_notes.txt",
}

-- ---------- helpers ----------
local function safe(f, ...)
    if type(f) ~= "function" then return nil end
    local ok, r = pcall(f, ...)
    if ok then return r end
    return nil
end
local function num(v) return tonumber(v) or 0 end

local POS = {[0]="GK","SW","RWB","RB","RCB","CB","LCB","LB","LWB","RDM","CDM","LDM","RM","RCM","CM","LCM","LM",
             "RAM","CAM","LAM","RF","CF","LF","RW","RS","ST","LS","LW","SUB","RES"}
local EXCLUDED_LEAGUES = { [78]=true, [2136]=true, [76]=true, [383]=true }
local EXCLUDED_WOMEN_COMPS = {
    [343]=true, [1836]=true, [812]=true, [889]=true, [1566]=true, [1404]=true, [990]=true, [1037]=true
}

local cache = { p = {}, t = {}, c = {} }
local function pname(id)
    id = tonumber(id); if not id then return "?" end
    if not cache.p[id] then
        local n = safe(GetPlayerName, id)
        cache.p[id] = (n and n ~= "") and n or ("Player#" .. id)
    end
    return cache.p[id]
end
local function tname(id)
    id = tonumber(id); if not id then return "?" end
    if not cache.t[id] then
        local n = safe(GetTeamName, id)
        cache.t[id] = (n and n ~= "") and n or ("Team#" .. id)
    end
    return cache.t[id]
end

local COMPETITION_NAME_FALLBACKS = {
    [1] = "Men's Int. Cup",
    [54] = "European Champ.",
    [75] = "EC Qualifiers",
    [88] = "UEFA Super Cup",
    [91] = "UEFA Champions League",
    [135] = "UEFA Champions League",
    [190] = "UEFA Europa League",
    [234] = "UEFA Europa League",
    [269] = "UEFA Conference League",
    [313] = "UEFA Conference League",
    [373] = "Österreich-Pokal",
    [391] = "Ö. Bundesliga",
    [397] = "Ö. Bundesliga Play-offs",
    [404] = "Croky Cup",
    [426] = "1A Pro League",
    [432] = "Pro League Play-Off",
    [437] = "Pokalen",
    [455] = "3F Superliga",
    [461] = "Superliga Playoffs",
    [466] = "FA Community Shield",
    [469] = "Emirates FA Cup",
    [585] = "Carabao Cup",
    [704] = "Vertu Trophy",
    [776] = "Premier League",
    [779] = "EFL Championship",
    [782] = "EFL League One",
    [785] = "EFL League Two",
    [788] = "Champ Play-Offs",
    [796] = "Lg One Play-Offs",
    [804] = "Lg Two Play-Offs",
    [816] = "Trophée Champ.",
    [819] = "Coupe de France",
    [874] = "Ligue 1 McDonald's",
    [877] = "Ligue 2 BKT",
    [880] = "Barrages Ligue 1",
    [900] = "F. Beckenbauer Supercup",
    [905] = "DFB-Pokal",
    [971] = "Bundesliga",
    [974] = "Bundesliga 2",
    [977] = "Relegation Play-Offs",
    [982] = "3. Liga",
    [985] = "Relegation Play-Offs",
    [994] = "SD Men's FAI Cup",
    [1010] = "SSE Airtricity PD",
    [1014] = "EA SPORTS FC Supercup",
    [1022] = "Coppa Italia",
    [1076] = "Serie A Enilive",
    [1079] = "Serie BKT",
    [1082] = "Serie BKT Playoff",
    [1094] = "Oranje Beker",
    [1119] = "Eredivisie",
    [1123] = "NM",
    [1145] = "Eliteserien",
    [1149] = "Puchar Kraju",
    [1177] = "PKO BP Ekstraklasa",
    [1181] = "Taça Portuguesa",
    [1206] = "Liga Portugal",
    [1210] = "Cupa Națională",
    [1234] = "SUPERLIGA",
    [1240] = "SUPERLIGA Play-offs",
    [1247] = "Scottish Cup",
    [1275] = "Scottish Prem",
    [1282] = "Supercopa",
    [1290] = "Copa de España",
    [1390] = "LALIGA EA SPORTS",
    [1393] = "LALIGA HYPERMOTION",
    [1396] = "P. de Ascenso",
    [1408] = "Sveriges Cup",
    [1426] = "Allsvenskan",
    [1430] = "Schweizer Pokal",
    [1448] = "Brack Super League",
    [1455] = "Türkiye Kupası",
    [1480] = "Trendyol Süper Lig",
    [1497] = "U.S. Open Cup",
    [1533] = "MLS",
    [1584] = "Asia Contl Cup",
    [1606] = "A-League",
    [1622] = "CSL",
    [1626] = "ISL",
    [1638] = "K League 1",
    [1645] = "ROSHN Saudi League",
    [1653] = "Recopa",
    [1656] = "CONMEBOL Libertadores",
    [1686] = "CONMEBOL Sudamericana",
    [1687] = "CONMEBOL Libertadores",
    [1715] = "CONMEBOL Sudamericana",
    [1778] = "Torneo Apertura",
    [1801] = "Torneo Clausura",
}

-- Mapping UEFA Stage/Fixture CIDs to their parent tournament
local UEFA_MAP = {
    [91]  = 91,
    [135] = 91,
    [190] = 190,
    [234] = 190,
    [269] = 269,
    [313] = 269,
}
local UEFA_CIDS = { [91] = true, [190] = true, [269] = true }

local function cname(id)
    id = tonumber(id); if not id then return "?" end
    local mapped_id = UEFA_MAP[id] or id
    if not cache.c[mapped_id] then
        local n = safe(GetCompetitionNameByObjID, mapped_id)
        if n and n ~= "" and not string.find(tostring(n), "^COBJ") then
            if n == "UECL" then n = "UEFA Conference League" end
            cache.c[mapped_id] = n
        else
            cache.c[mapped_id] = COMPETITION_NAME_FALLBACKS[mapped_id] or ("Comp#" .. mapped_id)
        end
    end
    return cache.c[mapped_id]
end
local function unknown_comp(n) return string.find(tostring(n), "^COBJ") ~= nil or string.find(tostring(n), "^Comp#") ~= nil end

local function format_currency(amount)
    local formatted = tostring(math.floor(num(amount)))
    while true do
        local k
        formatted, k = string.gsub(formatted, "^(-?%d+)(%d%d%d)", '%1,%2')
        if (k == 0) then break end
    end
    return "€" .. formatted
end

local function load(tbl, fields)
    local rows = safe(GetDBTableRows, tbl)
    if type(rows) ~= "table" then Log("WARNING: could not read table " .. tbl); return {} end
    local out = {}
    for i, r in ipairs(rows) do
        local o = {}
        for _, f in ipairs(fields) do
            local c = r[f]
            if type(c) == "table" then o[f] = tonumber(c["value"]) or c["value"] end
        end
        out[i] = o
    end
    return out
end

-- Exact civil day arithmetic
local function civil_from_days(z)
    z = z + 719468
    local era = z // 146097
    local doe = z - era * 146097
    local yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    local y = yoe + era * 400
    local doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    local mp = (5 * doy + 2) // 153
    local d = doy - (153 * mp + 2) // 5 + 1
    local m = mp < 10 and mp + 3 or mp - 9
    if m <= 2 then y = y + 1 end
    return y, m, d
end
local function ymd_from_fifa_days(n) return civil_from_days(math.floor(n) - 141427) end

local function days_from_civil(y, m, d)
    if m <= 2 then y = y - 1; m = m + 9 else m = m - 3 end
    local era = (y >= 0 and y or y - 399) // 400
    local yoe = y - era * 400
    local doy = (153 * m + 2) // 5 + d - 1
    local doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468
end
local function day_num(ymd)
    ymd = math.floor(num(ymd))
    if ymd <= 0 then return 0 end
    return days_from_civil(ymd // 10000, (ymd // 100) % 100, ymd % 100)
end

local function fmt_date(n)
    n = math.floor(num(n))
    return string.format("%04d-%02d-%02d", n // 10000, (n // 100) % 100, n % 100)
end

local out = {}
local function P(s) out[#out + 1] = s or "" end
local function H(s) P(""); P("=== " .. s .. " ==="); end

local function candidate_dirs()
    local dirs = {}
    local profile = (os and os.getenv) and os.getenv("USERPROFILE") or nil
    if profile then
        dirs[#dirs + 1] = profile .. "\\Desktop\\"
        dirs[#dirs + 1] = profile .. "\\OneDrive\\Desktop\\"
        dirs[#dirs + 1] = profile .. "\\Documents\\"
    end
    dirs[#dirs + 1] = "C:\\FC 26 Live Editor\\"
    dirs[#dirs + 1] = ""
    return dirs
end
local function write_file(name, text)
    if not (io and io.open) then return nil end
    for _, d in ipairs(candidate_dirs()) do
        local ok, f = pcall(io.open, d .. name, "w")
        if ok and f then f:write(text); f:close(); return d .. name end
    end
    return nil
end
local function read_file(name)
    if not (io and io.open) then return nil end
    for _, d in ipairs(candidate_dirs()) do
        local ok, f = pcall(io.open, d .. name, "r")
        if ok and f then local t = f:read("*a"); f:close(); return t, d .. name end
    end
    return nil
end

-- ============================================================
-- LOAD DB DATA
-- ============================================================
if ReloadDB then pcall(ReloadDB) end
local in_cm = safe(IsInCM)
if not in_cm then
    if MessageBox then MessageBox("Season Export", "Load your career save first, then run again.") end
    Log("Not in career mode - aborting.")
    return
end

local U = load("career_users", {"clubteamid", "leagueid", "firstname", "surname", "seasoncount", "primarycompobjid"})[1] or {}
local my_team, my_league = num(U.clubteamid), num(U.leagueid)

local league_info = {}
for _, r in ipairs(load("leagues", {"leagueid", "leaguename", "level", "iswomencompetition", "isinternationalleague"})) do
    league_info[r.leagueid] = r
end

local links = load("leagueteamlinks", {"teamid", "leagueid", "previousyeartableposition", "prevleagueid"})
local team_league, by_league = {}, {}
for _, r in ipairs(links) do
    team_league[r.teamid] = r.leagueid
    by_league[r.leagueid] = by_league[r.leagueid] or {}
    table.insert(by_league[r.leagueid], r)
end

local pl = {}
for _, r in ipairs(load("players", {"playerid", "overallrating", "potential", "birthdate", "preferredposition1", "gender"})) do
    pl[r.playerid] = r
end

local function is_female_player(pid)
    local p = pl[num(pid)]
    return p and num(p.gender) == 1
end

local function is_women_team(t)
    local lg = team_league[num(t)]
    return lg and num((league_info[lg] or {}).iswomencompetition) == 1
end

local champion_of = {}
for _, r in ipairs(load("competition", {"competitionid", "competitionchampionid"})) do
    champion_of[r.competitionid] = r.competitionchampionid
end

local club_of, team_players, injured = {}, {}, {}
for _, r in ipairs(load("teamplayerlinks", {"teamid", "playerid", "position", "injury"})) do
    local lg = team_league[r.teamid]
    if lg and not EXCLUDED_LEAGUES[lg] and r.teamid ~= CFG.FREE_AGENTS_TEAMID then
        if not club_of[r.playerid] then
            club_of[r.playerid] = r.teamid
            team_players[r.teamid] = team_players[r.teamid] or {}
            table.insert(team_players[r.teamid], r.playerid)
            if num(r.injury) > 0 then injured[r.playerid] = true end
        end
    end
end

local rating_hist = load("career_playermatchratinghistory", {"playerid", "date", "rating", "minsplayed", "position"})
local ref_date = 0
for _, r in ipairs(rating_hist) do if num(r.date) > ref_date then ref_date = num(r.date) end end
do
    local cd = safe(GetCurrentDate)
    if type(cd) == "table" and num(cd.year) > 2000 then ref_date = num(cd.year) * 10000 + num(cd.month) * 100 + num(cd.day) end
end
if ref_date == 0 then ref_date = 20270610 end
local ref_y, ref_m, ref_d = ref_date // 10000, (ref_date // 100) % 100, ref_date % 100

local function age_of(pid)
    local p = pl[pid]; if not p or not p.birthdate then return nil end
    local by, bm, bd = ymd_from_fifa_days(p.birthdate)
    local a = ref_y - by
    if ref_m < bm or (ref_m == bm and ref_d < bd) then a = a - 1 end
    return a
end
local function pos_of(pid)
    local p = pl[pid]; if not p then return "?" end
    return POS[num(p.preferredposition1)] or "?"
end

local stats = safe(GetPlayersStats) or {}
local per_comp, per_player, comp_ids, comp_teams = {}, {}, {}, {}
local function add_agg(t, pid, r)
    local a = t[pid]
    if not a then a = { pid = pid, app = 0, goals = 0, assists = 0, yellow = 0, red = 0, cs = 0, avgsum = 0 }; t[pid] = a end
    a.app = a.app + num(r.app); a.goals = a.goals + num(r.goals); a.assists = a.assists + num(r.assists)
    a.yellow = a.yellow + num(r.yellow); a.red = a.red + num(r.red); a.cs = a.cs + num(r.clean_sheets)
    a.avgsum = a.avgsum + num(r.avg); a.teamid = r.teamid
end
for _, r in ipairs(stats) do
    local lg = team_league[r.teamid]
    local is_club = (not lg) or (not EXCLUDED_LEAGUES[lg] and num((league_info[lg] or {}).iswomencompetition or 0) ~= 1)
    if is_club and not is_female_player(r.playerid) then
        local c = r.compobjid
        if not per_comp[c] then per_comp[c] = {}; comp_ids[#comp_ids + 1] = c; comp_teams[c] = {} end
        comp_teams[c][r.teamid] = true
        add_agg(per_comp[c], r.playerid, r)
        add_agg(per_player, r.playerid, r)
    end
end

local function rating_of(a) if a.app > 0 then return a.avgsum / a.app / 10 end return 0 end
local function to_list(t) local l = {}; for _, v in pairs(t) do l[#l + 1] = v end; return l end
local function merge_comps(ids)
    local m = {}
    for _, c in ipairs(ids) do
        for pid, a in pairs(per_comp[c] or {}) do
            add_agg(m, pid, { app = a.app, goals = a.goals, assists = a.assists, yellow = a.yellow, red = a.red,
                              clean_sheets = a.cs, avg = a.avgsum, teamid = a.teamid })
        end
    end
    return m
end
local function top_by(list, keyfn, n, filter)
    local l = {}
    for _, a in ipairs(list) do if (not filter or filter(a)) and keyfn(a) > 0 then l[#l + 1] = a end end
    table.sort(l, function(x, y)
        local kx, ky = keyfn(x), keyfn(y)
        if kx ~= ky then return kx > ky end
        if x.app ~= y.app then return x.app < y.app end
        return x.pid < y.pid
    end)
    local r = {}
    for i = 1, math.min(n, #l) do r[i] = l[i] end
    return r
end

local function norm(s) return (string.lower(tostring(s or "")):gsub("[%p%s]", "")) end
local CUP_WORDS = { "cup", "trophy", "shield", "super", "beker", "pokal", "coppa", "copa", "taca", "coupe",
                    "community", "qualif", "world", "international", "champions", "europa", "uecl", "conference", "uwcl" }
local function looks_like_cup(n)
    for _, w in ipairs(CUP_WORDS) do if string.find(n, w, 1, true) then return true end end
    return false
end

local eligible = {}
for lid, info in pairs(league_info) do
    if num(info.iswomencompetition) ~= 1 and num(info.isinternationalleague) ~= 1 and not EXCLUDED_LEAGUES[lid] then
        eligible[lid] = norm(info.leaguename)
    end
end

local comp_rows = {}
for _, c in ipairs(comp_ids) do
    local n = 0
    for _ in pairs(per_comp[c]) do n = n + 1 end
    comp_rows[c] = n
end

local dom, chosen, comp_league = {}, {}, {}
for _, c in ipairs(comp_ids) do
    local cn = norm(cname(c))
    if comp_rows[c] >= 300 and not looks_like_cup(cn) then
        local counts, total = {}, 0
        for pid, a in pairs(per_comp[c]) do
            local lg = team_league[a.teamid]
            if lg then counts[lg] = (counts[lg] or 0) + 1; total = total + 1 end
        end
        local best, bestk = nil, 0
        for lg, k in pairs(counts) do if k > bestk then best, bestk = lg, k end end
        if best and eligible[best] and total > 0 and bestk / total >= 0.6 then dom[c] = { lid = best, share = bestk / total } end
    end
end
for c, d in pairs(dom) do
    local cur = chosen[d.lid]
    if not cur or comp_rows[c] > comp_rows[cur] then chosen[d.lid] = c end
end
local user_comp = num(U.primarycompobjid)
if user_comp > 0 and per_comp[user_comp] and eligible[my_league] then chosen[my_league] = user_comp end
local league_comps = {}
for lid, c in pairs(chosen) do
    comp_league[c] = lid
    league_comps[lid] = { c }
end

local selected = {}
for lid, _ in pairs(league_comps) do
    local info = league_info[lid]
    if (not CFG.MAIN_LEAGUES_ONLY) or num(info.level) == 1 or lid == my_league then selected[#selected + 1] = lid end
end
table.sort(selected, function(a, b)
    if (a == my_league) ~= (b == my_league) then return a == my_league end
    return tostring(league_info[a].leaguename) < tostring(league_info[b].leaguename)
end)

local top_flight = {}
for _, lid in ipairs(selected) do
    for _, r in ipairs(by_league[lid] or {}) do top_flight[r.teamid] = true end
end

local function to_ymd(d)
    d = math.floor(num(d))
    if d >= 19000101 and d <= 21001231 then return d end
    if d > 0 then
        local y, m, dd = ymd_from_fifa_days(d)
        if y >= 2020 and y <= 2035 then return y * 10000 + m * 100 + dd end
    end
    return 0
end

-- ============================================================
-- LIVE STANDINGS & FIXTURES FROM GAME MEMORY
-- ============================================================
local live = { ok = false, err = nil, standings = {}, fixtures = {}, by_index = {} }
do
    local ok, err = pcall(function()
        local iface = GetPlugin(ENUM_djb2IFCEInterface_CLSS)
        local mgr = MEMORY:ReadMultilevelPointer(iface, { 0x18, 0x10, 0x08, 0x00 })
        assert(mgr and mgr ~= 0, "game data manager not found")

        local function list_header(offset)
            local list = MEMORY:ReadPointer(mgr + offset)
            assert(list and list ~= 0, "list pointer is null")
            local first = MEMORY:ReadPointer(list + 0x28)
            local count = MEMORY:ReadInt(list + 0x1C)
            assert(first and first ~= 0 and count and count > 0 and count < 500000, "unexpected list header")
            return first, count
        end
        local ITEM = 0x18

        local sfirst, scount = list_header(0x88)
        for i = 0, scount - 1 do
            local a = sfirst + ITEM * i
            local team = MEMORY:ReadInt(a + 0x04)
            local raw_cid = MEMORY:ReadShort(a + 0x02)
            local cid = raw_cid - 47
            live.by_index[i] = { team = team, cid = cid, raw_cid = raw_cid }
            if team > 0 then
                local r = {
                    idx = i, cid = cid, raw_cid = raw_cid, team = team,
                    hw = MEMORY:ReadChar(a + 0x09), hd = MEMORY:ReadChar(a + 0x0A), hl = MEMORY:ReadChar(a + 0x0B),
                    hgf = MEMORY:ReadChar(a + 0x0C), hga = MEMORY:ReadChar(a + 0x0D),
                    aw = MEMORY:ReadChar(a + 0x0E), ad = MEMORY:ReadChar(a + 0x0F), al = MEMORY:ReadChar(a + 0x10),
                    agf = MEMORY:ReadChar(a + 0x11), aga = MEMORY:ReadChar(a + 0x12),
                    pts = MEMORY:ReadShort(a + 0x14),
                }
                r.w, r.d, r.l = r.hw + r.aw, r.hd + r.ad, r.hl + r.al
                r.p = r.w + r.d + r.l
                r.gf, r.ga = r.hgf + r.agf, r.hga + r.aga
                live.standings[#live.standings + 1] = r
            end
        end
        assert(#live.standings > 0, "no standings records found")

        local ffirst, fcount = list_header(0x60)
        for i = 0, fcount - 1 do
            local a = ffirst + ITEM * i
            local h_idx = MEMORY:ReadShort(a + 0x0A)
            local w_idx = MEMORY:ReadShort(a + 0x0C)
            local h_team = (live.by_index[h_idx] and live.by_index[h_idx].team) or (team_league[h_idx] and h_idx)
            local w_team = (live.by_index[w_idx] and live.by_index[w_idx].team) or (team_league[w_idx] and w_idx)
            if h_team and w_team and h_team > 0 and w_team > 0 and h_team ~= w_team then
                local d = to_ymd(MEMORY:ReadInt(a + 0x00))
                local hs, as = MEMORY:ReadChar(a + 0x0F), MEMORY:ReadChar(a + 0x11)
                local hp, ap = MEMORY:ReadChar(a + 0x10), MEMORY:ReadChar(a + 0x12)
                local valid_scores = (hs >= 0 and hs < 30 and as >= 0 and as < 30)
                live.fixtures[#live.fixtures + 1] = {
                    date = d, time = MEMORY:ReadShort(a + 0x04), cid = MEMORY:ReadShort(a + 0x08),
                    home_idx = h_idx, away_idx = w_idx,
                    home = h_team, away = w_team,
                    hs = valid_scores and hs or 0, as = valid_scores and as or 0,
                    hp = (hp >= 0 and hp < 30) and hp or 0, ap = (ap >= 0 and ap < 30) and ap or 0,
                    match_group = MEMORY:ReadChar(a + 0x0E),
                    done = (valid_scores and d > 0 and d <= ref_date) or false,
                }
            end
        end
    end)
    if ok then
        live.ok = true
        Log(string.format("Live memory read: %d standings records, %d fixtures", #live.standings, #live.fixtures))
    else
        live.err = (tostring(err):match("[^\n]+")) or tostring(err)
        Log("Live memory read failed: " .. live.err)
    end
end

local fx_by_cid, fx_by_team, fx_by_league, league_fx_cid, is_league_cid = {}, {}, {}, {}, {}
local fixture_to_standings_cid, standings_to_fixture_cid = {}, {}
if live.ok then
    for _, f in ipairs(live.fixtures) do
        fx_by_cid[f.cid] = fx_by_cid[f.cid] or {}
        table.insert(fx_by_cid[f.cid], f)
        fx_by_team[f.home] = fx_by_team[f.home] or {}
        table.insert(fx_by_team[f.home], f)
        fx_by_team[f.away] = fx_by_team[f.away] or {}
        table.insert(fx_by_team[f.away], f)

        local st = live.by_index[f.home_idx]
        local true_cid = st and num(st.cid) or 0
        if true_cid > 0 then
            fixture_to_standings_cid[f.cid] = true_cid
            if true_cid ~= f.cid then standings_to_fixture_cid[true_cid] = f.cid end
        end
    end
    local best = {}
    for cid, list in pairs(fx_by_cid) do
        local counts, total = {}, #list
        for _, f in ipairs(list) do
            local lh, la = team_league[f.home], team_league[f.away]
            if lh and la and lh == la then counts[lh] = (counts[lh] or 0) + 1 end
        end
        for lg, k in pairs(counts) do
            if total >= 30 and k / total >= 0.9 and (not best[lg] or total > best[lg].total) then best[lg] = { cid = cid, total = total } end
        end
    end
    for lg, b in pairs(best) do
        league_fx_cid[lg] = b.cid
        is_league_cid[b.cid] = true
        fx_by_league[lg] = fx_by_cid[b.cid]
    end
    for _, list in pairs(fx_by_league) do
        table.sort(list, function(x, y) if x.date ~= y.date then return x.date < y.date end return x.home < y.home end)
    end
    for _, list in pairs(fx_by_team) do
        table.sort(list, function(x, y) if x.date ~= y.date then return x.date < y.date end return x.home < y.home end)
    end
end

local function women_share(rows)
    local w = 0
    for _, r in ipairs(rows) do
        if is_women_team(r.team) then w = w + 1 end
    end
    return #rows > 0 and (w / #rows) or 0
end

-- Standings groups
local live_tables, euro_tables, other_tables = {}, {}, {}
if live.ok then
    local groups = {}
    for _, r in ipairs(live.standings) do
        groups[r.cid] = groups[r.cid] or {}
        table.insert(groups[r.cid], r)
    end
    for cid, rows in pairs(groups) do
        if #rows >= 8 and women_share(rows) < 0.3 and not EXCLUDED_WOMEN_COMPS[cid] then
            local counts, distinct_lgs, total, games = {}, 0, 0, 0
            for _, r in ipairs(rows) do
                local lg = team_league[r.team]
                if lg then
                    if not counts[lg] then distinct_lgs = distinct_lgs + 1 end
                    counts[lg] = (counts[lg] or 0) + 1
                    total = total + 1
                end
                games = games + r.p
            end
            local best_lg, best_cnt = nil, 0
            for lg, cnt in pairs(counts) do if cnt > best_cnt then best_lg, best_cnt = lg, cnt end end
            
            if best_lg and eligible[best_lg] and total > 0 and (best_cnt / total >= 0.6) then
                local cur = live_tables[best_lg]
                if not cur or games > cur.games then live_tables[best_lg] = { cid = cid, rows = rows, games = games } end
            elseif distinct_lgs >= 3 and games > 0 then
                euro_tables[#euro_tables + 1] = { cid = cid, rows = rows, games = games }
            elseif best_lg and games > 0 and not eligible[best_lg] then
                other_tables[best_lg] = { cid = cid, rows = rows, games = games }
            end
        end
    end
end

-- ============================================================
-- INTELLIGENT SEASON PHASE DETECTION
-- ============================================================
local season_phase = "mid"
local my_table = live_tables[my_league]
local my_max_p = 0
if my_table and my_table.rows then
    for _, r in ipairs(my_table.rows) do
        if r.p > my_max_p then my_max_p = r.p end
    end
end

if ref_m >= 7 and ref_m <= 9 and my_max_p <= 8 then
    season_phase = "early"
elseif (ref_m == 5 and my_max_p >= 33) or ref_m == 6 or my_max_p >= 34 then
    season_phase = "end"
elseif ref_m >= 3 and ref_m <= 5 then
    season_phase = "runin"
else
    season_phase = "mid"
end

-- ============================================================
-- TRANSFER HISTORY ENGINE
-- ============================================================
local function get_live_transfer_history()
    local transfers = {}
    local ok, err = pcall(function()
        local transfer_mgr = GetManagerObjByTypeId(ENUM_FCEGameModesFCECareerModeTransferManager)
        if not transfer_mgr or transfer_mgr == 0 then return end
        local neg_storage = MEMORY:ReadPointer(transfer_mgr + 0x1DD0)
        if not neg_storage or neg_storage == 0 then return end

        local player_negos = {}
        local club_negos = {}

        local function read_club_deals(storage_offset, obj_size, req_offset, is_user)
            local vec = MEMORY:ReadPointer(neg_storage + storage_offset)
            if not vec or vec == 0 then return end
            local mBegin = MEMORY:ReadPointer(vec + 0x0)
            local mEnd = MEMORY:ReadPointer(vec + 0x8)
            if not mBegin or not mEnd or mBegin == 0 then return end
            local cur = mBegin
            while cur < mEnd do
                local pid = MEMORY:ReadInt(cur + 0x0)
                local buy = MEMORY:ReadInt(cur + 0x4)
                local sel = MEMORY:ReadInt(cur + 0x8)
                if pid > 0 and buy > 0 and sel > 0 then
                    local fee = 0
                    if is_user then
                        local mActionsBegin = MEMORY:ReadPointer(cur + 0x58)
                        local mActionsEnd = MEMORY:ReadPointer(cur + 0x60)
                        if mActionsBegin ~= mActionsEnd then
                            local last_act = MEMORY:ReadChar(mActionsEnd - 0xC + 0x8)
                            if last_act == 0 or last_act == 4 then
                                local mLast = (last_act == 0) and MEMORY:ReadPointer(cur + 0x20) or MEMORY:ReadPointer(cur + 0x40)
                                local exchange_player, exchange_value = 0, 0
                                if mLast and mLast ~= 0 then
                                    local base = mLast - 0x28
                                    exchange_player = MEMORY:ReadInt(base + 0x0)
                                    exchange_value = MEMORY:ReadInt(base + 0x4)
                                    fee = MEMORY:ReadInt(base + 0xC)
                                end
                                club_negos[string.format("%d-%d-%d", pid, buy, sel)] = {
                                    fee = fee, exchange_player = exchange_player, exchange_value = exchange_value
                                }
                            end
                        end
                    else
                        local sel_acc = MEMORY:ReadBool(cur + 0x6E)
                        local buy_acc = MEMORY:ReadBool(cur + 0x6F)
                        if sel_acc or buy_acc then
                            if sel_acc then
                                local ptr = MEMORY:ReadPointer(cur + 0x28)
                                if ptr and ptr ~= 0 then fee = MEMORY:ReadInt(ptr - 0xC) end
                            else
                                local ptr = MEMORY:ReadPointer(cur + 0x48)
                                if ptr and ptr ~= 0 then fee = MEMORY:ReadInt(ptr - 0x14) end
                            end
                            club_negos[string.format("%d-%d-%d", pid, buy, sel)] = { fee = fee }
                        end
                    end
                end
                cur = cur + obj_size
            end
        end

        local function read_player_deals(storage_offset, obj_size, is_user, dtype)
            local vec = MEMORY:ReadPointer(neg_storage + storage_offset)
            if not vec or vec == 0 then return end
            local mBegin = MEMORY:ReadPointer(vec + 0x0)
            local mEnd = MEMORY:ReadPointer(vec + 0x8)
            if not mBegin or not mEnd or mBegin == 0 then return end
            local cur = mBegin
            while cur < mEnd do
                local pid = MEMORY:ReadInt(cur + 0x0)
                local buy = MEMORY:ReadInt(cur + 0x4)
                local sel = MEMORY:ReadInt(cur + 0x8)
                if pid > 0 and buy > 0 and sel > 0 then
                    local accepted = false
                    local act_date = 0
                    if is_user then
                        local mActionsBegin = MEMORY:ReadPointer(cur + 0x50)
                        local mActionsEnd = MEMORY:ReadPointer(cur + 0x58)
                        if mActionsBegin ~= mActionsEnd then
                            local last_act = MEMORY:ReadChar(mActionsEnd - 0xC + 0x8)
                            if last_act == 0 or last_act == 4 then
                                accepted = true
                                act_date = MEMORY:ReadInt(mActionsEnd - 0xC + 0x0)
                            end
                        end
                    else
                        accepted = MEMORY:ReadBool(cur + (dtype == "Loan" and 0x52 or 0x67))
                        if accepted then
                            local last_idx = MEMORY:ReadChar(cur + (dtype == "Loan" and 0x57 or 0x6C))
                            if last_idx >= 0 and last_idx < 10 then
                                act_date = MEMORY:ReadInt(cur + (dtype == "Loan" and 0x58 or 0x70) + (0xC * last_idx))
                            end
                        end
                    end
                    if accepted then
                        player_negos[string.format("%d-%d-%d", pid, buy, sel)] = {
                            playerid = pid, buying_team = buy, selling_team = sel, date = to_ymd(act_date), dtype = dtype
                        }
                    end
                end
                cur = cur + obj_size
            end
        end

        read_club_deals(0x8, 0xB8, 0x48, false)
        read_club_deals(0x28, 0xA0, 0x40, true)
        read_player_deals(0x10, 0xB0, false, "Transfer")
        read_player_deals(0x38, 0x98, true, "Transfer")
        read_player_deals(0x20, 0x98, false, "Loan")

        for k, p in pairs(player_negos) do
            local c = club_negos[k] or {}
            local fee = c.fee or 0
            if not is_female_player(p.playerid) and not is_women_team(p.buying_team) and not is_women_team(p.selling_team) then
                transfers[#transfers + 1] = {
                    playerid = p.playerid, from = p.selling_team, to = p.buying_team,
                    fee = fee, exchange_player = c.exchange_player or 0,
                    exchange_value = c.exchange_value or 0, date = p.date, dtype = p.dtype
                }
            end
        end

        table.sort(transfers, function(a, b)
            if a.fee ~= b.fee then return a.fee > b.fee end
            return a.date < b.date
        end)
    end)
    return transfers
end

local all_completed_transfers = get_live_transfer_history()

local function result_letter(f, team)
    local mine, theirs
    if f.home == team then mine, theirs = f.hs, f.as else mine, theirs = f.as, f.hs end
    if mine > theirs then return "W" elseif mine < theirs then return "L" end
    return "D"
end
local function team_form(fixtures, team, n)
    local res = {}
    for _, f in ipairs(fixtures or {}) do
        if f.done and (f.home == team or f.away == team) then res[#res + 1] = result_letter(f, team) end
    end
    local o = {}
    for i = math.max(1, #res - n + 1), #res do o[#o + 1] = res[i] end
    return #o > 0 and table.concat(o) or "-"
end
local function score_line(f)
    local pen = (f.hs == f.as and (f.hp > 0 or f.ap > 0)) and string.format(" (pens %d-%d)", f.hp, f.ap) or ""
    return string.format("%s%s %d-%d %s%s", f.date > 0 and (fmt_date(f.date) .. " ") or "", tname(f.home), f.hs, f.as, tname(f.away), pen)
end

local league_agg, league_list = {}, {}
for _, lid in ipairs(selected) do
    league_agg[lid] = merge_comps(league_comps[lid] or {})
    league_list[lid] = to_list(league_agg[lid])
end

local function pfull(a)
    local p = pl[a.pid] or {}
    local extra = ""
    if num(p.preferredposition1) == 0 and a.cs > 0 then extra = string.format(", %d clean sheets", a.cs) end
    return string.format("%s (%s, %s, age %s, OVR %s/POT %s) - %d apps, %d G, %d A, %.1f avg rating%s",
        pname(a.pid), tname(a.teamid), pos_of(a.pid), tostring(age_of(a.pid) or "?"),
        tostring(p.overallrating or "?"), tostring(p.potential or "?"),
        a.app, a.goals, a.assists, rating_of(a), extra)
end

local function pcards(a)
    return string.format("%s (%s, %s, age %s, OVR %s) - %d yellow, %d red in %d apps",
        pname(a.pid), tname(a.teamid), pos_of(a.pid), tostring(age_of(a.pid) or "?"),
        tostring((pl[a.pid] or {}).overallrating or "?"), a.yellow, a.red, a.app)
end

local function print_full(title, rows)
    if #rows == 0 then return end
    P("  " .. title .. ":")
    for i, a in ipairs(rows) do P(string.format("   %d. %s", i, pfull(a))) end
end

local function print_cards(title, rows)
    if #rows == 0 then return end
    P("  " .. title .. ":")
    for i, a in ipairs(rows) do P(string.format("   %d. %s", i, pcards(a))) end
end

-- ============================================================
-- HEADER
-- ============================================================
P("SEASON REVIEW DATA - EA SPORTS FC 26 CAREER MODE")
P("")
if season_phase == "end" then
    P("Snapshot: END-OF-SEASON (in-game date: " .. fmt_date(ref_date) .. ").")
else
    P("Snapshot: " .. string.upper(season_phase) .. "-SEASON (in-game date: " .. fmt_date(ref_date) .. "). Competitions may still be in progress.")
end
P("")
P("Latest in-game date seen: " .. fmt_date(ref_date))
P(string.format("User: %s %s | Club: %s | League: %s | Season: %s",
    tostring(U.firstname or "?"), tostring(U.surname or "?"), tname(my_team),
    (league_info[my_league] and league_info[my_league].leaguename) or "?", tostring(U.seasoncount or "?")))

-- ============================================================
-- LEAGUE TABLES
-- ============================================================
H("LEAGUES COVERED (simulated domestic leagues in this save)")
for _, lid in ipairs(selected) do
    P("  " .. tostring(league_info[lid].leaguename) .. (lid == my_league and "  [YOUR LEAGUE]" or ""))
end

local function sort_rows(rows)
    table.sort(rows, function(a, b)
        if a.pts ~= b.pts then return a.pts > b.pts end
        local ga, gb = a.gf - a.ga, b.gf - b.ga
        if ga ~= gb then return ga > gb end
        if a.gf ~= b.gf then return a.gf > b.gf end
        return a.team < b.team
    end)
end

local function print_live_table(lid)
    local t = live_tables[lid]
    local rows = {}
    for _, r in ipairs(t.rows) do rows[#rows + 1] = r end
    sort_rows(rows)
    local prevpos = {}
    for _, r in ipairs(by_league[lid] or {}) do
        if num(r.prevleagueid) == lid and num(r.previousyeartableposition) > 0 then prevpos[r.teamid] = num(r.previousyeartableposition) end
    end
    local fx = fx_by_league[lid] or {}
    for i, r in ipairs(rows) do
        P(string.format("%2d. %-26s P%-2d W%-2d D%-2d L%-2d GF%-3d GA%-3d GD%+d  %3d pts  form %-5s last season: %s%s",
            i, tname(r.team), r.p, r.w, r.d, r.l, r.gf, r.ga, r.gf - r.ga, r.pts, team_form(fx, r.team, 5),
            prevpos[r.team] and (prevpos[r.team] .. ".") or "n/a", r.team == my_team and "  <== YOUR CLUB" or ""))
    end
    if #rows >= 4 then
        local n = #rows
        P(string.format("   Title race: leader %s, %d pt(s) ahead of 2nd; gap 1st-4th: %d pts; gap between %d-th and %d-th (relegation-zone edge): %d pts",
            tname(rows[1].team), rows[1].pts - rows[2].pts, rows[1].pts - rows[4].pts, n - 3, n - 2, rows[n - 3].pts - rows[n - 2].pts))
    end
    local done = {}
    for _, f in ipairs(fx) do if f.done then done[#done + 1] = f end end
    if #done > 0 then
        local goals, hw, dr, aw = 0, 0, 0, 0
        for _, f in ipairs(done) do
            goals = goals + f.hs + f.as
            if f.hs > f.as then hw = hw + 1 elseif f.hs < f.as then aw = aw + 1 else dr = dr + 1 end
        end
        P(string.format("   %d league matches played | %.2f goals/game | home wins %d%% / draws %d%% / away wins %d%%",
            #done, goals / #done, math.floor(100 * hw / #done + 0.5), math.floor(100 * dr / #done + 0.5), math.floor(100 * aw / #done + 0.5)))
        local by_margin = {}
        for _, f in ipairs(done) do by_margin[#by_margin + 1] = f end
        table.sort(by_margin, function(x, y)
            local mx, my = math.abs(x.hs - x.as), math.abs(y.hs - y.as)
            if mx ~= my then return mx > my end
            if x.hs + x.as ~= y.hs + y.as then return x.hs + x.as > y.hs + y.as end
            return x.date < y.date
        end)
        P("   Biggest wins:")
        for i = 1, math.min(5, #by_margin) do P("     " .. score_line(by_margin[i])) end
        table.sort(by_margin, function(x, y)
            if x.hs + x.as ~= y.hs + y.as then return x.hs + x.as > y.hs + y.as end
            return x.date < y.date
        end)
        P("   Highest-scoring games:")
        for i = 1, math.min(3, #by_margin) do P("     " .. score_line(by_margin[i])) end
    end
end

H("LEAGUE TABLES (live, from game memory)")
for _, lid in ipairs(selected) do
    P("")
    local champ = champion_of[lid]
    P(string.format("-- %s%s", tostring(league_info[lid].leaguename),
        (champ and champ > 0) and (" (last season's champion per DB: " .. tname(champ) .. ")") or ""))
    if live_tables[lid] and live_tables[lid].games > 0 then
        print_live_table(lid)
    else
        P("   Live table not available in this run.")
    end
end

-- ============================================================
-- WORLD LEAGUES ROUNDUP
-- ============================================================
local world_lids = {}
for lid, t in pairs(live_tables) do
    local is_selected = false
    for _, sl in ipairs(selected) do if sl == lid then is_selected = true; break end end
    if not is_selected and league_info[lid] and num(league_info[lid].iswomencompetition) ~= 1 then
        world_lids[#world_lids + 1] = lid
    end
end
for lid in pairs(other_tables) do
    local seen = false
    for _, x in ipairs(world_lids) do if x == lid then seen = true; break end end
    if not seen and league_info[lid] and num(league_info[lid].iswomencompetition) ~= 1 then world_lids[#world_lids + 1] = lid end
end
table.sort(world_lids, function(a, b) return tostring(league_info[a].leaguename) < tostring(league_info[b].leaguename) end)

if #world_lids > 0 then
    local printed_any = false
    for _, lid in ipairs(world_lids) do
        local t = live_tables[lid] or other_tables[lid]
        local rows = {}
        for _, r in ipairs(t.rows or {}) do rows[#rows + 1] = r end
        sort_rows(rows)
        local expected = #(by_league[lid] or {})
        local ok_table = t.games > 0
            and num(league_info[lid].isinternationalleague) ~= 1
            and (expected == 0 or #rows <= expected + 4)
            and rows[1].pts > 0

        if ok_table and #rows >= 4 then
            if not printed_any then H("WORLD LEAGUES ROUNDUP (compact active leagues)"); printed_any = true end
            P(string.format("-- %s%s", tostring(league_info[lid].leaguename), (expected > 0 and #rows < expected) and string.format(" (%d of %d teams)", #rows, expected) or ""))
            P(string.format("   1st: %s (%d pts, GD %+d) | 2nd: %s (%d) | 3rd: %s (%d)",
                tname(rows[1].team), rows[1].pts, rows[1].gf - rows[1].ga,
                tname(rows[2].team), rows[2].pts, tname(rows[3].team), rows[3].pts))
            P(string.format("   Bottom: %d. %s (%d) | %d. %s (%d)",
                #rows - 1, tname(rows[#rows - 1].team), rows[#rows - 1].pts,
                #rows, tname(rows[#rows].team), rows[#rows].pts))
        end
    end
end

-- ============================================================
-- EUROPEAN & TOURNAMENT TABLES
-- ============================================================
local function euro_title(t)
    local direct_name = cname(t.cid)
    if not unknown_comp(direct_name) then return direct_name end

    local best_c, best_ov = nil, 0
    for _, c in ipairs(comp_ids) do
        local ov = 0
        for _, r in ipairs(t.rows) do if comp_teams[c] and comp_teams[c][r.team] then ov = ov + 1 end end
        if ov / #t.rows > best_ov then best_c, best_ov = c, ov / #t.rows end
    end
    if best_c and best_ov >= 0.4 then return cname(best_c) end
    return COMPETITION_NAME_FALLBACKS[t.cid] or ("European tournament (CID " .. t.cid .. ")")
end

if #euro_tables > 0 then
    H("EUROPEAN & TOURNAMENT TABLES (Swiss League Phase & Invitational)")
    table.sort(euro_tables, function(a, b)
        if #a.rows ~= #b.rows then return #a.rows > #b.rows end
        return a.cid < b.cid
    end)
    for _, t in ipairs(euro_tables) do
        local rows = {}
        for _, r in ipairs(t.rows) do rows[#rows + 1] = r end
        sort_rows(rows)
        local title = euro_title(t)
        local lt = string.lower(title)
        local uefa_format = #rows >= 32 and (string.find(lt, "champions league", 1, true) or string.find(lt, "europa league", 1, true)
            or string.find(lt, "uecl", 1, true) or string.find(lt, "conference", 1, true))
        P("")
        P("-- " .. title .. " (league phase / group table)")
        for i, r in ipairs(rows) do
            P(string.format("   %2d. %-26s P%-2d W%-2d D%-2d L%-2d GF%-3d GA%-3d GD%+d  %3d pts%s",
                i, tname(r.team), r.p, r.w, r.d, r.l, r.gf, r.ga, r.gf - r.ga, r.pts, r.team == my_team and "  <== YOUR CLUB" or ""))
            if uefa_format then
                if i == 8 then P("   ---- top 8: direct place in the Round of 16 ----") end
                if i == 24 then P("   ---- 9th-24th: knockout play-off; 25th and below: eliminated ----") end
            end
        end
    end
end

-- ============================================================
-- KNOCKOUT CUPS (Domestic & European Knockout Phase)
-- ============================================================
local function is_women_or_friendly_name(n)
    local x = string.lower(tostring(n or ""))
    return string.find(x, "women", 1, true) or string.find(x, "women's", 1, true)
        or string.find(x, "frauen", 1, true) or string.find(x, "femin", 1, true)
        or string.find(x, "friendly", 1, true) or string.find(x, "pre-season", 1, true)
        or string.find(x, "qualif", 1, true)
end

local cup_fx = {}
if live.ok then
    for _, f in ipairs(live.fixtures) do
        if f.done then
            local eff_cid = UEFA_MAP[f.cid] or f.cid
            local is_uefa = UEFA_CIDS[eff_cid] or false
            local nm = cname(eff_cid)

            local is_domestic_league = false
            if not is_uefa then
                if is_league_cid[f.cid] or is_league_cid[eff_cid] or league_comps[f.cid] or f.cid == 426 then
                    is_domestic_league = true
                else
                    for lid, _ in pairs(league_comps) do
                        if league_fx_cid[lid] == f.cid or lid == f.cid then
                            is_domestic_league = true
                            break
                        end
                    end
                end
            end

            -- In UEFA Swiss phase, matches occur in autumn/winter (months 8, 9, 10, 11, 12, 1)
            -- Knockouts occur in spring (months 2, 3, 4, 5, 6)
            local f_m = (f.date > 0) and ((f.date // 100) % 100) or 0
            local is_euro_swiss_phase = is_uefa and (f_m == 1 or f_m >= 8)

            local eligible_match = not is_domestic_league and not is_euro_swiss_phase
                and f.cid ~= 704 and f.cid ~= 75
                and not EXCLUDED_WOMEN_COMPS[f.cid]
                and not EXCLUDED_WOMEN_COMPS[eff_cid]
                and not is_women_or_friendly_name(nm)
                and (is_uefa or top_flight[f.home] or top_flight[f.away] or f.home == my_team or f.away == my_team)

            if eligible_match then
                cup_fx[eff_cid] = cup_fx[eff_cid] or {}
                table.insert(cup_fx[eff_cid], f)
            end
        end
    end
end

local function canonical_pair(a, b)
    a, b = num(a), num(b)
    if a <= b then return a, b, tostring(a) .. "_" .. tostring(b) end
    return b, a, tostring(b) .. "_" .. tostring(a)
end

local function match_winner(f)
    if f.hs > f.as then return f.home end
    if f.as > f.hs then return f.away end
    if f.hp > f.ap then return f.home end
    if f.ap > f.hp then return f.away end
    return nil
end

local function build_knockout_tie(matches)
    table.sort(matches, function(a, b)
        if a.date ~= b.date then return a.date < b.date end
        return (a.time or 0) < (b.time or 0)
    end)
    local a_id, b_id = canonical_pair(matches[1].home, matches[1].away)
    local a_name, b_name = tname(a_id), tname(b_id)
    local a_goals, b_goals = 0, 0
    local legs = {}
    for _, f in ipairs(matches) do
        local a_score, b_score = f.hs, f.as
        if f.home == b_id then a_score, b_score = f.as, f.hs end
        a_goals = a_goals + a_score
        b_goals = b_goals + b_score
        legs[#legs + 1] = f
    end
    local winner = nil
    if a_goals > b_goals then winner = a_id
    elseif b_goals > a_goals then winner = b_id
    else winner = match_winner(legs[#legs]) end
    return {
        a_id = a_id, b_id = b_id, a_name = a_name, b_name = b_name,
        a_goals = a_goals, b_goals = b_goals, winner = winner,
        legs = legs, first_date = legs[1].date, last_date = legs[#legs].date,
    }
end

local function split_knockout_rounds(ties)
    table.sort(ties, function(a, b)
        if a.first_date ~= b.first_date then return a.first_date < b.first_date end
        return tostring(a.a_name) < tostring(b.a_name)
    end)
    local groups, cur, last_dnum = {}, {}, 0
    for _, tie in ipairs(ties) do
        local t_dnum = day_num(tie.first_date)
        if #cur > 0 and last_dnum > 0 and t_dnum > 0 and (t_dnum - last_dnum > 10) then
            groups[#groups + 1] = cur
            cur = {}
        end
        cur[#cur + 1] = tie
        if t_dnum > last_dnum then last_dnum = t_dnum end
    end
    if #cur > 0 then groups[#groups + 1] = cur end
    return groups
end

-- Strictly restricts cup finals to genuine cup-final windows
local function is_cup_final_month(cid, m)
    if m == 8 then return true end -- Pre-season Supercups (August)
    if cid == 585 and (m == 2 or m == 3) then return true end -- Carabao Cup (late Feb/March)
    if (m == 4 or m == 5 or m == 6) then return true end -- Spring domestic & European finals (April, May, June)
    return false
end

local function get_stage_name(rnd, ri, total_rounds, is_completed, cid)
    local n = #rnd
    local m = (rnd[1].first_date // 100) % 100
    local is_uefa = (cid == 91 or cid == 190 or cid == 269)

    if is_completed then
        local steps_from_final = total_rounds - ri
        if steps_from_final == 0 then
            return "Final"
        elseif steps_from_final == 1 and n <= 2 then
            return "Semi-Finals"
        elseif steps_from_final == 2 and n <= 4 then
            return "Quarter-Finals"
        elseif steps_from_final == 3 and n <= 8 then
            return "Round of 16"
        elseif steps_from_final == 4 then
            return is_uefa and "Knockout Round Play-offs" or "Round of 32"
        elseif steps_from_final >= 5 then
            return is_uefa and "Preliminary Knockout Round" or ("Round " .. ri)
        end
    end

    if n == 8 then
        if is_uefa and m == 2 then return "Knockout Round Play-offs" end
        return "Round of 16"
    end
    if n == 16 then return "Round of 32" end
    if n == 4 and (m == 12 or m == 1 or m == 2 or m == 3 or m == 4 or season_phase == "end") then
        return "Quarter-Finals"
    end
    if n == 2 and (m == 1 or m == 2 or m == 3 or m == 4 or m == 5 or season_phase == "end") then
        return "Semi-Finals"
    end
    if n == 1 then
        if cid == 585 and m == 12 then
            return string.format("Quarter-Final Tie (from %s, in progress)", fmt_date(rnd[1].first_date))
        end
        return string.format("Knockout Tie (from %s, in progress)", fmt_date(rnd[1].first_date))
    end

    return string.format("Round %d (%d ties, from %s)", ri, n, fmt_date(rnd[1].first_date))
end

local cup_cids = {}
for cid in pairs(cup_fx) do cup_cids[#cup_cids + 1] = cid end
table.sort(cup_cids, function(a, b) return tostring(cname(a)) < tostring(cname(b)) end)

if #cup_cids > 0 then
    H("CUPS AND KNOCKOUT COMPETITIONS")
    for _, cid in ipairs(cup_cids) do
        local nm = cname(cid)
        local flist = cup_fx[cid]
        local pair_map = {}
        for _, f in ipairs(flist) do
            local a, b, key = canonical_pair(f.home, f.away)
            if a > 0 and b > 0 then
                pair_map[key] = pair_map[key] or {}
                table.insert(pair_map[key], f)
            end
        end

        local ties = {}
        for _, matches in pairs(pair_map) do ties[#ties + 1] = build_knockout_tie(matches) end
        local rounds = split_knockout_rounds(ties)

        local is_single_match_cup = (#flist == 1)
        local last_round = rounds[#rounds]
        local last_m = last_round and ((last_round[1].first_date // 100) % 100) or 0
        local is_cup_completed = is_single_match_cup or
            (last_round and #last_round == 1 and (season_phase == "end" or is_cup_final_month(cid, last_m)))

        P("")
        P(string.format("-- %s (%d matches logged, %d ties)", unknown_comp(nm) and ("Competition object " .. cid) or nm, #flist, #ties))
        for ri = #rounds, 1, -1 do
            local rnd = rounds[ri]
            local stage = get_stage_name(rnd, ri, #rounds, is_cup_completed, cid)
            P("   " .. stage .. ":")
            table.sort(rnd, function(a, b) return a.first_date < b.first_date end)
            for _, tie in ipairs(rnd) do
                local marker = (tie.a_id == my_team or tie.b_id == my_team) and "  <== YOUR CLUB" or ""
                if #tie.legs == 1 then
                    local f = tie.legs[1]
                    local winner_text = tie.winner and (" | winner: " .. tname(tie.winner)) or ""
                    P("     " .. score_line(f) .. winner_text .. marker)
                else
                    local pen_str = ""
                    if tie.a_goals == tie.b_goals and #tie.legs > 1 then
                        local last_f = tie.legs[#tie.legs]
                        if last_f.hp > 0 or last_f.ap > 0 then
                            local a_pens = (last_f.home == tie.a_id) and last_f.hp or last_f.ap
                            local b_pens = (last_f.home == tie.b_id) and last_f.hp or last_f.ap
                            pen_str = string.format(" (pens %d-%d)", a_pens, b_pens)
                        end
                    end
                    P(string.format("     %s %d-%d %s (aggregate)%s%s",
                        tie.a_name, tie.a_goals, tie.b_goals, tie.b_name, pen_str,
                        tie.winner and (" | winner: " .. tname(tie.winner)) or ""))
                    for li, f in ipairs(tie.legs) do
                        P(string.format("       Leg %d: %s", li, score_line(f)))
                    end
                end
            end
        end

        if is_cup_completed and last_round and #last_round == 1 and last_round[1].winner then
            P("   Champion / Winner: " .. tname(last_round[1].winner))
        end
    end
end

-- ============================================================
-- TRANSFERS RECAP (Live from Career TransferManager)
-- ============================================================
H("COMPLETED TRANSFERS THIS SEASON (live from Career TransferManager)")
if #all_completed_transfers > 0 then
    local my_deals = {}
    local marquee_deals = {}
    for _, t in ipairs(all_completed_transfers) do
        if t.to == my_team or t.from == my_team then
            my_deals[#my_deals + 1] = t
        else
            if #marquee_deals < 20 and t.fee > 0 then marquee_deals[#marquee_deals + 1] = t end
        end
    end

    P("-- Your Club's Completed Deals (" .. tname(my_team) .. ")")
    if #my_deals > 0 then
        for _, t in ipairs(my_deals) do
            local is_buy = (t.to == my_team)
            local p = pl[t.playerid] or {}
            local kind = (t.dtype == "Loan") and (is_buy and "LOAN IN" or "LOAN OUT") or (is_buy and "SIGNED" or "SOLD")
            local fee_str = (t.dtype == "Loan") and "Loan" or (t.fee == 0 and "Free" or format_currency(t.fee))
            local exchange_txt = ""
            if t.exchange_player and t.exchange_player > 0 then
                exchange_txt = " | + " .. pname(t.exchange_player) .. " in exchange"
                if t.exchange_value and t.exchange_value > 0 then exchange_txt = exchange_txt .. " (valued " .. format_currency(t.exchange_value) .. ")" end
            end
            P(string.format("   %s: %s (%s, age %s, OVR %s) | %s -> %s | Fee: %s%s%s",
                kind, pname(t.playerid), pos_of(t.playerid),
                tostring(age_of(t.playerid) or "?"), tostring(p.overallrating or "?"),
                tname(t.from), tname(t.to), fee_str, exchange_txt, t.date > 0 and (" | Date: " .. fmt_date(t.date)) or ""))
        end
    else
        P("   (No direct transfers logged for your club in this window)")
    end

    P("")
    P("-- Top 20 Marquee Transfers in World Football")
    for i, t in ipairs(marquee_deals) do
        local p = pl[t.playerid] or {}
        local exchange_txt = ""
        if t.exchange_player and t.exchange_player > 0 then exchange_txt = " | + " .. pname(t.exchange_player) .. " in exchange" end
        P(string.format("   %2d. %s (%s, OVR %s): %s -> %s | Fee: %s%s",
            i, pname(t.playerid), pos_of(t.playerid), tostring(p.overallrating or "?"),
            tname(t.from), tname(t.to), format_currency(t.fee), exchange_txt))
    end
else
    P("(Transfer memory pool not accessible or no transfers logged yet)")
end

-- ============================================================
-- LEAGUE DETAILS & PLAYER STATS
-- ============================================================
H("LEAGUE DETAILS: TOP PLAYERS (season stats, league matches only)")
for _, lid in ipairs(selected) do
    local list = league_list[lid]
    local maxapp = 0
    for _, a in ipairs(list) do if a.app > maxapp then maxapp = a.app end end
    local min_apps = math.max(3, math.floor(maxapp * 0.5))
    P("")
    P("##### " .. tostring(league_info[lid].leaguename) .. " (most appearances: " .. maxapp .. ")")
    if #list > 0 then
        print_full("Top scorers", top_by(list, function(a) return a.goals end, CFG.TOP_N))
        print_full("Top assists", top_by(list, function(a) return a.assists end, CFG.TOP_N))
        print_full("Most goal involvements (G+A)", top_by(list, function(a) return a.goals + a.assists end, 5))
        print_full("Best average rating (min " .. min_apps .. " apps)",
            top_by(list, function(a) return rating_of(a) end, CFG.TOP_N, function(a) return a.app >= min_apps end))
        print_full("Best goalkeepers by clean sheets",
            top_by(list, function(a) return a.cs end, 3, function(a) return pl[a.pid] and num(pl[a.pid].preferredposition1) == 0 end))
        print_full("Young players making an impact (age 21 or under, min 4 apps, by rating)",
            top_by(list, function(a) return rating_of(a) end, 6, function(a)
                local ag = age_of(a.pid); return ag and ag <= 21 and a.app >= 4 end))
        print_cards("Most yellow cards", top_by(list, function(a) return a.yellow end, 3))
        print_cards("Red cards", top_by(list, function(a) return a.red end, 3))
    else
        P("  (no player stats tracked for this league)")
    end
end

-- ============================================================
-- STORY HOOKS
-- ============================================================
H("STORY HOOKS (auto-detected from the numbers)")
local all_league = {}
for _, lid in ipairs(selected) do
    for _, a in ipairs(league_list[lid]) do all_league[#all_league + 1] = a end
end
local ATTACKERS = { ST = true, CF = true, LS = true, RS = true, LW = true, RW = true, LF = true, RF = true, CAM = true, LAM = true, RAM = true, RM = true, LM = true }
print_full("Unlikely heroes (OVR 74 or lower but scoring freely)",
    top_by(all_league, function(a) return a.goals end, 8, function(a)
        local p = pl[a.pid]; return p and num(p.overallrating) <= 74 and a.goals >= 5 and a.app >= 5 end))

local flops = {}
for _, a in ipairs(all_league) do
    local p = pl[a.pid]
    if p and num(p.overallrating) >= 82 and ATTACKERS[pos_of(a.pid)] and a.app >= 8 and a.goals <= 3 and rating_of(a) < 7.5 and (a.goals + a.assists) <= 4 then
        flops[#flops + 1] = a
    end
end
table.sort(flops, function(x, y)
    local ox, oy = num(pl[x.pid].overallrating), num(pl[y.pid].overallrating)
    if ox ~= oy then return ox > oy end
    return x.pid < y.pid
end)
if #flops > 0 then
    P("  Big-name attackers who have struggled (OVR 82+, <=3 goals, avg rating < 7.5, 8+ apps):")
    for i = 1, math.min(8, #flops) do P(string.format("   %d. %s", i, pfull(flops[i]))) end
end

print_full("Veterans still delivering (age 34+, ranked by goal involvements)",
    top_by(all_league, function(a) return a.goals + a.assists end, 6, function(a)
        local ag = age_of(a.pid); return ag and ag >= 34 and (a.goals + a.assists) >= 5 end))
print_full("Rising teenagers (age 20 or under, 5+ apps, by rating)",
    top_by(all_league, function(a) return rating_of(a) end, 8, function(a)
        local ag = age_of(a.pid); return ag and ag <= 20 and a.app >= 5 end))
print_full("Highest-rated defenders and midfielders (min 8 apps, non-attackers, non-GK)",
    top_by(all_league, function(a) return rating_of(a) end, 8, function(a)
        local ps = pos_of(a.pid); return a.app >= 8 and not ATTACKERS[ps] and ps ~= "GK" end))

-- ============================================================
-- WORLD BEST XI & AWARDS ENGINE
-- ============================================================
local awards_label = (season_phase == "end") and "SEASON AWARDS & TEAM OF THE YEAR" or "MID-SEASON HONORS & TEAM OF THE SEASON SO FAR"
H(awards_label .. " (all club competitions)")
local all_players = to_list(per_player)

local function is_top_competition_team(tid)
    tid = num(tid)
    if tid == my_team then return true end
    if top_flight[tid] then return true end
    for _, c in ipairs({ 91, 135, 190, 234, 269, 313 }) do
        if comp_teams[c] and comp_teams[c][tid] then return true end
    end
    local lg = team_league[tid]
    if lg and league_info[lg] and num(league_info[lg].level) == 1 then return true end
    return false
end

local min_apps_xi = (season_phase == "end") and 16 or 6

local function xi_score(a, role)
    local r = rating_of(a)
    local apps = a.app
    local g = a.goals
    local ast = a.assists
    local cs = a.cs
    local vol_bonus = math.min(0.5, (apps / 30) * 0.5)

    if role == "GK" then
        return r + (cs * 0.05) + vol_bonus
    elseif role == "RB" or role == "LB" then
        return r + (g * 0.08) + (ast * 0.06) + (cs * 0.03) + vol_bonus
    elseif role == "CB" then
        return r + (g * 0.06) + (ast * 0.03) + (cs * 0.04) + vol_bonus
    elseif role == "MID" then
        return r + (g * 0.045) + (ast * 0.04) + vol_bonus
    elseif role == "FWD" then
        return r + (g * 0.038) + (ast * 0.025) + vol_bonus
    end
    return r + vol_bonus
end

P("  Golden Boot front-runners:")
for i, a in ipairs(top_by(all_players, function(a) return a.goals end, 10)) do
    P(string.format("   %2d. %s (%s, %s, age %s) - %d goals in %d apps (%.2f per game) | %d assists, %.1f avg rating",
        i, pname(a.pid), tname(club_of[a.pid] or a.teamid), pos_of(a.pid), tostring(age_of(a.pid) or "?"),
        a.goals, a.app, a.app > 0 and (a.goals / a.app) or 0, a.assists, rating_of(a)))
end

-- Playmaker of the Season
local top_playmakers = top_by(all_players, function(a) return a.assists end, 5)
if #top_playmakers > 0 then
    P("")
    P("  Playmaker of the Season front-runners (Most Assists):")
    for i, a in ipairs(top_playmakers) do
        P(string.format("   %2d. %s (%s, %s, age %s) - %d assists in %d apps | %d goals, %.1f avg rating",
            i, pname(a.pid), tname(club_of[a.pid] or a.teamid), pos_of(a.pid), tostring(age_of(a.pid) or "?"),
            a.assists, a.app, a.goals, rating_of(a)))
    end
end

-- Young Player of the Season
local young_stars = top_by(all_players, function(a) return xi_score(a, "MID") end, 5, function(a)
    local ag = age_of(a.pid)
    return ag and ag <= 21 and a.app >= min_apps_xi and is_top_competition_team(club_of[a.pid] or a.teamid)
end)
if #young_stars > 0 then
    P("")
    P("  Young Player of the Season candidates (Age 21 or under):")
    for i, a in ipairs(young_stars) do
        P(string.format("   %d. %s (%s, %s, age %d, OVR %s) - %d apps, %d G, %d A, %.1f avg rating",
            i, pname(a.pid), tname(club_of[a.pid] or a.teamid), pos_of(a.pid), age_of(a.pid),
            tostring((pl[a.pid] or {}).overallrating or "?"), a.app, a.goals, a.assists, rating_of(a)))
    end
end

-- Signings of the Season
local signing_eval = {}
for _, t in ipairs(all_completed_transfers) do
    if t.dtype ~= "Loan" and t.to and t.to > 0 and (top_flight[t.to] or t.to == my_team) then
        local pid = t.playerid
        local a = per_player[pid]
        if a and a.app >= 10 then
            local p = pl[pid] or {}
            local score = (a.goals * 2.0) + (a.assists * 1.5) + (rating_of(a) * 3.0) + (a.app * 0.2)
            if t.fee and t.fee > 0 then
                local mill = t.fee / 1000000
                if mill < 20 then score = score + 5 end
            elseif t.fee == 0 then
                score = score + 8
            end
            signing_eval[#signing_eval + 1] = {
                t = t, a = a, p = p, score = score
            }
        end
    end
end
table.sort(signing_eval, function(x, y) return x.score > y.score end)
if #signing_eval > 0 then
    P("")
    P("  Signings of the Season (Top performers for their new clubs):")
    for i = 1, math.min(5, #signing_eval) do
        local item = signing_eval[i]
        local fee_str = (item.t.fee == 0) and "Free" or format_currency(item.t.fee)
        P(string.format("   %d. %s (%s, age %s) | %s -> %s (%s) - %d apps, %d G, %d A, %.1f avg rating",
            i, pname(item.a.pid), pos_of(item.a.pid), tostring(age_of(item.a.pid) or "?"),
            tname(item.t.from), tname(item.t.to), fee_str, item.a.app, item.a.goals, item.a.assists, rating_of(item.a)))
    end
end

-- Tactically Balanced Best XI (4-3-3) & Bench
P("")
P("  Tactically Balanced Best XI (4-3-3, elite competitions only):")
local used_pid = {}
local function in_set(p, ...) for _, v in ipairs({...}) do if p == v then return true end end return false end

local function best_by_role(role, pos_check, count)
    local l = {}
    for _, a in ipairs(all_players) do
        local tid = club_of[a.pid] or a.teamid
        if (not used_pid[a.pid]) and a.app >= min_apps_xi and is_top_competition_team(tid) and pos_check(pos_of(a.pid)) then
            l[#l + 1] = a
        end
    end
    table.sort(l, function(x, y)
        local sx, sy = xi_score(x, role), xi_score(y, role)
        if sx ~= sy then return sx > sy end
        if x.app ~= y.app then return x.app > y.app end
        return x.pid < y.pid
    end)
    local res = {}
    for i = 1, math.min(count, #l) do
        res[#res + 1] = l[i]
        used_pid[l[i].pid] = true
    end
    return res
end

local function xi_line(tag, a, gk)
    P(string.format("   %-4s %s (%s%s) - %.1f avg rating, %d apps, %d G, %d A%s", tag, pname(a.pid), tname(club_of[a.pid] or a.teamid),
        gk and "" or (", " .. pos_of(a.pid)), rating_of(a), a.app, a.goals, a.assists, gk and (", " .. a.cs .. " clean sheets") or ""))
end

for _, a in ipairs(best_by_role("GK", function(p) return p == "GK" end, 1)) do xi_line("GK", a, true) end
for _, a in ipairs(best_by_role("RB", function(p) return in_set(p, "RB", "RWB") end, 1)) do xi_line("RB", a) end
for _, a in ipairs(best_by_role("CB", function(p) return in_set(p, "CB", "LCB", "RCB") end, 2)) do xi_line("CB", a) end
for _, a in ipairs(best_by_role("LB", function(p) return in_set(p, "LB", "LWB") end, 1)) do xi_line("LB", a) end
for _, a in ipairs(best_by_role("MID", function(p) return in_set(p, "CDM", "CM", "CAM", "LM", "RM", "RDM", "LDM", "RCM", "LCM") end, 3)) do xi_line("MID", a) end
for _, a in ipairs(best_by_role("FWD", function(p) return in_set(p, "ST", "CF", "LW", "RW", "LS", "RS") end, 3)) do xi_line("FWD", a) end

P("")
P("  Substitutes Bench (World Squad of the Season):")
for _, a in ipairs(best_by_role("GK", function(p) return p == "GK" end, 1)) do xi_line("SUB", a, true) end
for _, a in ipairs(best_by_role("CB", function(p) return in_set(p, "CB", "LCB", "RCB", "RB", "LB", "RWB", "LWB") end, 2)) do xi_line("SUB", a) end
for _, a in ipairs(best_by_role("MID", function(p) return in_set(p, "CDM", "CM", "CAM", "LM", "RM", "RDM", "LDM", "RCM", "LCM") end, 2)) do xi_line("SUB", a) end
for _, a in ipairs(best_by_role("FWD", function(p) return in_set(p, "ST", "CF", "LW", "RW", "LS", "RS") end, 2)) do xi_line("SUB", a) end

-- ============================================================
-- EUROPEAN COMPETITIONS: TOP STATS
-- ============================================================
H("EUROPEAN COMPETITIONS: TOP INDIVIDUAL STATS")
for _, c in ipairs(comp_ids) do
    local n = string.lower(cname(c))
    if (string.find(n, "champions league", 1, true) or string.find(n, "europa league", 1, true)
        or string.find(n, "uecl", 1, true) or string.find(n, "conference league", 1, true))
        and not string.find(n, "women", 1, true) and not EXCLUDED_WOMEN_COMPS[c] then
        local list = to_list(per_comp[c])
        P("")
        P("-- " .. cname(c))
        print_full("Top scorers", top_by(list, function(a) return a.goals end, 6))
        print_full("Top assists", top_by(list, function(a) return a.assists end, 5))
        print_full("Best ratings (min 4 apps)", top_by(list, function(a) return rating_of(a) end, 5, function(a) return a.app >= 4 end))
    end
end

-- ============================================================
-- YOUR CLUB
-- ============================================================
H("YOUR CLUB: " .. tname(my_team))
for _, r in ipairs(load("career_managerhistory", {"season", "games_played", "wins", "draws", "losses", "goals_for",
        "goals_against", "points", "leagueobjective", "leagueobjectiveresult", "domestic_cup_objective",
        "domestic_cup_result", "leaguetrophies", "domesticcuptrophies", "continentalcuptrophies",
        "bigbuyplayername", "bigbuyamount", "bigsellplayername", "bigsellamount", "jobsecurityscore"})) do
    P(string.format("Season %s record (all competitions): played %d, W%d D%d L%d | GF %d, GA %d | %d pts",
        tostring(r.season), num(r.games_played), num(r.wins), num(r.draws), num(r.losses), num(r.goals_for), num(r.goals_against), num(r.points)))
    P(string.format("   Board objectives (raw codes): league=%s (result %s), domestic cup=%s (result %s), job security=%s/100",
        tostring(r.leagueobjective), tostring(r.leagueobjectiveresult), tostring(r.domestic_cup_objective),
        tostring(r.domestic_cup_result), tostring(r.jobsecurityscore)))
    P(string.format("   Trophies so far: league %s, domestic cup %s, continental %s",
        tostring(r.leaguetrophies), tostring(r.domesticcuptrophies), tostring(r.continentalcuptrophies)))
    P(string.format("   Biggest signing: %s (%s) | Biggest sale: %s (%s)",
        tostring(r.bigbuyplayername), tostring(r.bigbuyamount), tostring(r.bigsellplayername), tostring(r.bigsellamount)))
end

P("")
P("-- Squad performance (all competitions)")
local squad = {}
for _, pid in ipairs(team_players[my_team] or {}) do squad[#squad + 1] = pid end
table.sort(squad, function(a, b)
    local oa, ob = num((pl[a] or {}).overallrating), num((pl[b] or {}).overallrating)
    if oa ~= ob then return oa > ob end
    return a < b
end)
for _, pid in ipairs(squad) do
    local p = pl[pid] or {}
    local s = per_player[pid]
    local sline = s and string.format("%d apps, %d G, %d A, %.1f avg rating, %d YC, %d RC", s.app, s.goals, s.assists, rating_of(s), s.yellow, s.red) or "no competitive stats"
    P(string.format("   %s (%s, age %s) OVR %d / POT %d | %s%s", pname(pid), pos_of(pid), tostring(age_of(pid) or "?"),
        num(p.overallrating), num(p.potential), sline, injured[pid] and " | INJURED" or ""))
end

P("")
P("-- Match-by-match results (competition, opponent, score, best-rated player of the day)")

local function load_match_details()
    local text = read_file("fc26_match_details.jsonl")
    if not text or text == "" then return {} end
    local matches = {}
    for line in text:gmatch("[^\r\n]+") do
        local d = tonumber(line:match('"date":(%d+)'))
        if d then
            local entry = { scorers = {}, assists = {} }

            local sc_block = line:match('"scorers":%[(.-)%],"assists"')
            if sc_block and sc_block ~= "" then
                for item in sc_block:gmatch('%b{}') do
                    local name = item:match('"name":"([^"]+)"')
                    local team = item:match('"team":"([^"]+)"')
                    local is_mine = item:match('"is_mine":true') ~= nil
                    local g = tonumber(item:match('"g":(%d+)'))
                    local mins = tonumber(item:match('"mins":(%d+)'))
                    local rating = tonumber(item:match('"rating":(%d+)'))
                    if name and g then
                        entry.scorers[#entry.scorers + 1] = {
                            name = name, team = team, is_mine = is_mine, g = g,
                            mins = mins, rating = rating
                        }
                    end
                end
            end

            local as_block = line:match('"assists":%[(.-)%]}')
            if as_block and as_block ~= "" then
                for item in as_block:gmatch('%b{}') do
                    local name = item:match('"name":"([^"]+)"')
                    local team = item:match('"team":"([^"]+)"')
                    local is_mine = item:match('"is_mine":true') ~= nil
                    local a = tonumber(item:match('"a":(%d+)'))
                    local mins = tonumber(item:match('"mins":(%d+)'))
                    local rating = tonumber(item:match('"rating":(%d+)'))
                    if name and a then
                        entry.assists[#entry.assists + 1] = {
                            name = name, team = team, is_mine = is_mine, a = a,
                            mins = mins, rating = rating
                        }
                    end
                end
            end

            matches[d] = entry
        end
    end
    return matches
end

local match_details = load_match_details()

local players_by_date = {}
for _, r in ipairs(rating_hist) do
    local d = num(r.date)
    if not players_by_date[d] then players_by_date[d] = {} end
    local pid = num(r.playerid)
    local pos_name = POS[num(r.position)]
    if not pos_name or pos_name == "SUB" or pos_name == "RES" or pos_name == "?" then
        pos_name = pos_of(pid)
    end
    table.insert(players_by_date[d], {
        pid = pid,
        rating = num(r.rating),
        mins = num(r.minsplayed),
        pos = pos_name
    })
end

for d, plist in pairs(players_by_date) do
    table.sort(plist, function(a, b)
        if a.rating ~= b.rating then return a.rating > b.rating end
        if a.mins ~= b.mins then return a.mins > b.mins end
        return a.pid < b.pid
    end)
end

local function comp_label(f)
    if league_fx_cid[my_league] and f.cid == league_fx_cid[my_league] then return tostring(league_info[my_league].leaguename) end
    local n = cname(f.cid)
    if unknown_comp(n) then return "Other competition" end
    return n
end

local my_fx = fx_by_team[my_team] or {}
local played_matches, upcoming_matches = {}, {}
for _, f in ipairs(my_fx) do
    if f.done then played_matches[#played_matches + 1] = f
    elseif f.date > ref_date then upcoming_matches[#upcoming_matches + 1] = f end
end

if #played_matches > 0 then
    local w, d, l = 0, 0, 0
    for _, f in ipairs(played_matches) do
        local res = result_letter(f, my_team)
        if res == "W" then w = w + 1 elseif res == "D" then d = d + 1 else l = l + 1 end
        local is_home = (f.home == my_team)
        local opp = is_home and f.away or f.home

        P(string.format("   %s | %-22s | %s %-24s | %s %d-%d%s", fmt_date(f.date), comp_label(f), is_home and "vs" or "at", tname(opp), res,
            is_home and f.hs or f.as, is_home and f.as or f.hs,
            (f.hs == f.as and (f.hp > 0 or f.ap > 0)) and string.format(" (pens %d-%d)", is_home and f.hp or f.ap, is_home and f.ap or f.hp) or ""))

        local plist = players_by_date[f.date]
        if plist and #plist > 0 then
            local top_strs = {}
            for i = 1, math.min(3, #plist) do
                local p = plist[i]
                top_strs[#top_strs + 1] = string.format("%d. %s (%s | %.1f | %dm)", i, pname(p.pid), p.pos, p.rating, p.mins)
            end
            P("     Top 3: " .. table.concat(top_strs, ", "))
        end

        local tracked = match_details[f.date]
        if tracked and (#tracked.scorers > 0 or #tracked.assists > 0) then
            local function fmt_p(p)
                local meta = {}
                if p.mins then meta[#meta + 1] = p.mins .. " mins" end
                if p.rating then meta[#meta + 1] = string.format("%.1f rating", p.rating) end
                local extra = #meta > 0 and (" | " .. table.concat(meta, " | ")) or ""
                return string.format("%s (%s%s)", p.name, p.g and (p.g .. "G") or (p.a .. "A"), extra)
            end

            local my_g, opp_g = {}, {}
            for _, s in ipairs(tracked.scorers) do
                if s.is_mine then my_g[#my_g + 1] = fmt_p(s) else opp_g[#opp_g + 1] = fmt_p(s) end
            end
            if #my_g > 0 or #opp_g > 0 then
                P("     Goals:")
                if #my_g > 0 then P(string.format("       - %s: %s", tname(my_team), table.concat(my_g, ", "))) end
                if #opp_g > 0 then P(string.format("       - %s: %s", tname(opp), table.concat(opp_g, ", "))) end
            end

            local my_a, opp_a = {}, {}
            for _, a in ipairs(tracked.assists) do
                if a.is_mine then my_a[#my_a + 1] = fmt_p(a) else opp_a[#opp_a + 1] = fmt_p(a) end
            end
            if #my_a > 0 or #opp_a > 0 then
                P("     Assists:")
                if #my_a > 0 then P(string.format("       - %s: %s", tname(my_team), table.concat(my_a, ", "))) end
                if #opp_a > 0 then P(string.format("       - %s: %s", tname(opp), table.concat(opp_a, ", "))) end
            end
        end
    end
    P(string.format("   Total in these matches: W%d D%d L%d", w, d, l))
end

table.sort(upcoming_matches, function(x, y) return x.date < y.date end)
if #upcoming_matches > 0 then
    P("")
    P("  Next fixtures:")
    for i = 1, math.min(3, #upcoming_matches) do
        local f = upcoming_matches[i]
        local is_home = (f.home == my_team)
        P(string.format("   %s | %-22s | %s %s", fmt_date(f.date), comp_label(f), is_home and "vs" or "at", tname(is_home and f.away or f.home)))
    end
end

-- ============================================================
-- MANAGER MOVEMENT
-- ============================================================
local MANAGER_SNAPSHOT_FILE = "fc26_manager_snapshot.txt"
local function manager_snapshot_load()
    local text = read_file(MANAGER_SNAPSHOT_FILE)
    local snap = {}
    if text then
        for id, team, name in string.gmatch(text, "(%d+)|(%d+)|([^|\r\n]+)") do
            snap[num(id)] = { team = num(team), name = name }
        end
    end
    return snap
end
local function manager_snapshot_current()
    local snap = {}
    local rows = load("manager", {"managerid", "teamid", "firstname", "surname"})
    for _, r in ipairs(rows) do
        local id = num(r.managerid)
        if id > 0 then
            local first, last = tostring(r.firstname or ""), tostring(r.surname or "")
            local name = (first .. " " .. last):gsub("^%s+", ""):gsub("%s+$", "")
            if name == "" then name = "Manager#" .. id end
            snap[id] = { team = num(r.teamid), name = name }
        end
    end
    return snap
end
local previous_managers = manager_snapshot_load()
local current_managers = manager_snapshot_current()
local manager_moves = {}
for id, oldm in pairs(previous_managers) do
    local cur = current_managers[id]
    if cur and cur.team ~= oldm.team then
        manager_moves[#manager_moves + 1] = { id = id, name = cur.name ~= "" and cur.name or oldm.name, from = oldm.team, to = cur.team }
    end
end
if #manager_moves > 0 then
    H("MANAGER MOVES SINCE LAST EXPORT")
    table.sort(manager_moves, function(a, b) return a.name < b.name end)
    for _, m in ipairs(manager_moves) do
        P(string.format("   %s: %s -> %s", m.name, tname(m.from), tname(m.to)))
    end
else
    H("MANAGER MOVES")
    P("   No manager moves detected since the previous export.")
end

-- ============================================================
-- PENDING / AGREED TRANSFERS
-- ============================================================
H("PENDING / AGREED TRANSFERS (career_presignedcontract)")
for _, r in ipairs(load("career_presignedcontract", {"playerid", "teamid", "offerteamid", "offeredfee", "completedate", "signeddate", "isloanbuy"})) do
    if not is_female_player(r.playerid) and not is_women_team(r.teamid) and not is_women_team(r.offerteamid) then
        local cur = club_of[r.playerid]
        local from, to
        if cur == r.offerteamid then from, to = r.offerteamid, r.teamid else from, to = r.teamid, r.offerteamid end
        P(string.format("   %s (OVR %s): %s -> %s | fee %s | signed %s | completes %s%s",
            pname(r.playerid), tostring((pl[r.playerid] or {}).overallrating or "?"), tname(from), tname(to),
            tostring(r.offeredfee), fmt_date(r.signeddate), fmt_date(r.completedate),
            (from == my_team or to == my_team) and "  <== YOUR CLUB" or ""))
    end
end

-- ============================================================
-- LAST SEASON COMPARISON
-- ============================================================
H("LAST SEASON vs THIS SEASON (all club competitions)")
local prev = {}
for _, r in ipairs(load("prevcompetitionstats", {"playerid", "goals", "appearances", "assists"})) do
    local t = prev[r.playerid] or { goals = 0, apps = 0, assists = 0 }
    prev[r.playerid] = t
    t.goals = t.goals + num(r.goals); t.apps = t.apps + num(r.appearances); t.assists = t.assists + num(r.assists)
end
local function prev_txt(pid)
    local t = prev[pid]
    if not t then return "last season: n/a" end
    return string.format("last season: %d G, %d A in %d apps", t.goals, t.assists, t.apps)
end
P("-- Top scorers this season, with last season's numbers")
for i, a in ipairs(top_by(all_players, function(a) return a.goals end, 15)) do
    P(string.format("   %d. %s (%s): %d G, %d A in %d apps | %s", i, pname(a.pid), tname(club_of[a.pid] or a.teamid),
        a.goals, a.assists, a.app, prev_txt(a.pid)))
end
local drops, rises = {}, {}
for pid, a in pairs(per_player) do
    local t = prev[pid]
    if t and t.apps >= 15 and a.app >= 8 then
        local last_rate, now_rate = t.goals / t.apps, a.goals / a.app
        if t.goals >= 12 and now_rate < last_rate * 0.6 then drops[#drops + 1] = { pid = pid, a = a, d = last_rate - now_rate } end
        if a.goals >= 6 and now_rate > math.max(last_rate * 1.6, 0.35) then rises[#rises + 1] = { pid = pid, a = a, d = now_rate - last_rate } end
    end
end
local function by_d(x, y) if x.d ~= y.d then return x.d > y.d end return x.pid < y.pid end
table.sort(drops, by_d)
table.sort(rises, by_d)
if #drops > 0 then
    P("")
    P("-- Goal droughts: big scorers last season whose scoring rate has fallen sharply")
    for i = 1, math.min(8, #drops) do
        local d = drops[i]
        P(string.format("   %s (%s): %d G in %d apps now | %s", pname(d.pid), tname(club_of[d.pid] or d.a.teamid), d.a.goals, d.a.app, prev_txt(d.pid)))
    end
end
if #rises > 0 then
    P("")
    P("-- Improvers: scoring rate up sharply on last season")
    for i = 1, math.min(8, #rises) do
        local d = rises[i]
        P(string.format("   %s (%s): %d G in %d apps now | %s", pname(d.pid), tname(club_of[d.pid] or d.a.teamid), d.a.goals, d.a.app, prev_txt(d.pid)))
    end
end

-- ============================================================
-- MANUAL NOTES + SAVE
-- ============================================================
local notes_text = read_file(CFG.NOTES_FILE)
if notes_text and #notes_text > 0 then
    H("MANUAL NOTES FROM THE USER (treat as facts)")
    P(notes_text)
end

do
    local lines = {}
    for id, m in pairs(current_managers) do
        lines[#lines + 1] = string.format("%d|%d|%s", id, m.team, tostring(m.name):gsub("[|\r\n]", " "))
    end
    table.sort(lines)
    write_file(MANAGER_SNAPSHOT_FILE, table.concat(lines, "\n"))
end

local text = table.concat(out, "\n")
local path = write_file(CFG.OUT_FILE, text)
if path then
    Log("Export saved: " .. path .. " (" .. #text .. " characters)")
    if MessageBox then MessageBox("Season Export", "Saved " .. path) end
else
    Log("Could not write file - dumping to log")
    for _, line in ipairs(out) do Log(line) end
end
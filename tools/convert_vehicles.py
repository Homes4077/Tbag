"""Convert the hand-edited raw vehicles list into the clean format the site uses.
Usage:  python tools/convert_vehicles.py vehicles.raw.json data/vehicles.json
Keep editing the raw file (old simple format); re-run this whenever you add a car."""
import json, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'vehicles.raw.json'
DST = sys.argv[2] if len(sys.argv) > 2 else 'data/vehicles.json'

NAME_OVERRIDE = {
 'v0011': 'Subaru Forester 2000cc (Non-Turbo)', 'v004': 'Toyota Vitz (XP90)',
 'v005': 'Subaru Forester Cross Sports (SG)', 'v008': 'Toyota Sienta (XP170)',
 'v0010': 'Toyota Corolla L-Touring (AE100)', 'v009': 'Toyota Corolla Fielder 1500cc',
}
MODEL_OVERRIDE = {
 'v0066':'Vezel','v0049':'Vezel','v0061':'Axio','v0047':'Demio','v004':'Vitz','v005':'Forester Cross Sports',
 'v001':'Swift RS','v0022':'Impreza GG3','v0039':'Land Cruiser LC76','v0038':'NZE','v0064':'DX102',
 'v009':'Corolla Fielder','v008':'Sienta','v0014':'Mira','v0011':'Forester','v0033':'Corolla 110',
 'v0010':'Corolla L-Touring','v0012':'Corolla L-Touring','v0034':'Hilux Revo','v002':'Fit','v003':'Swift',
}
BODY = [('fortuner','SUV'),('land cruiser','SUV'),('cx5','SUV'),('vezel','SUV'),('forester','SUV'),
        ('hilux','Pickup'),('hiace','Van'),('voxy','Minivan'),('wish','Minivan'),('sienta','Minivan'),
        ('fielder','Station Wagon'),('probox','Station Wagon'),('succeed','Station Wagon')]
UPPER = {'RS','WXB','NZE','UAE','SG'}

def case_word(w):
    if re.fullmatch(r'\d+cc', w, re.I): return w.lower()
    if re.search(r'\d', w): return w.upper()
    if w.upper() in UPPER: return w.upper()
    return '-'.join(p[:1].upper() + p[1:].lower() for p in w.split('-'))

def pretty_name(raw, vid):
    if vid in NAME_OVERRIDE: return NAME_OVERRIDE[vid]
    n = re.sub(r'\s+', ' ', raw.strip().replace('TOYOTAFIELDER', 'TOYOTA FIELDER').replace('DIAHATSU', 'DAIHATSU'))
    n = re.sub(r'\s*[.–-]\s*([A-Za-z]{2,3})\s*$', '', n)            # drop plate suffix (.KDA)
    n = re.sub(r'\s+z?wd$', '', n, flags=re.I)                       # "zwd" typo for 2WD
    n = re.sub(r'non\s*turbo', 'non-turbo', n, flags=re.I)
    n = re.sub(r'turbo\s*charged', 'turbocharged', n, flags=re.I)
    n = re.sub(r'valve\s*matic', 'valvematic', n, flags=re.I)
    n = re.sub(r'(?<=cc)\.', '', n)
    n = ' '.join(case_word(w) for w in n.split())
    if n.startswith('Land '): n = 'Toyota ' + n
    return n

FEAT = {
 'accident free':'Accident Free','accident-free':'Accident Free','original paint':'Original Paint',
 'ready documents':'Ready Documents','ready documentation':'Ready Documents','ready pocuments':'Ready Documents','readydocuments':'Ready Documents',
 'buy & drive':'Buy & Drive','buy and drive':'Buy & Drive','just buy & prive':'Buy & Drive',
 'trade-in accepted':'Trade-In Accepted','trade in also accepted':'Trade-In Accepted','trade-in acceptable':'Trade-In Accepted',
 'financing accepted':'Financing Accepted','well maintained':'Well Maintained','low mileage':'Low Mileage',
 'reverse camera':'Reverse Camera','reverse cam':'Reverse Camera','perfect suspension':'Perfect Suspension',
 'leather seats':'Leather Seats','fabric seats':'Fabric Seats','parking sensors':'Parking Sensors',
 'steering controls':'Steering Controls','cruisecontrol':'Cruise Control','cruise control':'Cruise Control',
 'push to start':'Push To Start','lady driven':'Lady Driven','blister shocks':'Blister Shocks',
 'great suspension':'Great Suspension','mechanically excellent':'Mechanically Excellent',
 'leaf spring':'Leaf Spring','black interior':'Black Interior','local assembly':'Local Assembly',
 'optional diff lock':'Optional Diff Lock','5-power windows':'5 Power Windows','low genuine mileage':'Low Genuine Mileage',
 'powerful & reliable':'Powerful & Reliable','performance':'Performance','asian used':'Asian Used',
 'super clean':'Super Clean','extremely clean':'Extremely Clean','superbly clean':'Superbly Clean',
 'cool music':'Cool Music','alloy rims':'Alloy Rims','new tyres':'New Tyres','bumper foglights':'Bumper Foglights',
 'wooden trim finish':'Wooden Trim Finish','comes with accessories':'Comes With Accessories',
 'delights original alloy rims':'Original Alloy Rims','fully loaded heavy music system':'Heavy Music System',
 'valve matic':'Valvematic Engine','brake pads both front and rear':'Brake Pads (Front & Rear)',
 'comes with accessories':'Comes With Accessories',
}
MULTI = {
 'very clean buy and drive':['Very Clean','Buy & Drive'],
 'wooden trim finish on alloyrims':['Wooden Trim Finish','Alloy Rims'],
 'new tyres on alloyrims':['New Tyres','Alloy Rims'],
 'super clean neat original gray interior':['Super Clean','Neat Original Gray Interior'],
 'ready documents buy & drive':['Ready Documents','Buy & Drive'],
 'valve matic automatic gear':['Valvematic Engine'],
}
CONDITION = {'mint condition':'Mint Condition','mintcondition':'Mint Condition','immaculate clean':'Immaculate',
             'fresh import':'Fresh Import','new':'New','used':'Used','ready used':'Used','modified':'Modified'}
CONDITION_RANK = ['Mint Condition','Immaculate','Fresh Import','New','Modified','Used']

def fmt_spec(key, val):
    v = val.strip().rstrip('.').strip()
    if key == 'acceleration':
        m = re.search(r'100\s*kph/([\d.]+)s', v); return 'Acceleration (0–100 km/h)', f'{m.group(1)} s' if m else v
    if key == 'fuel consumption':
        m = re.search(r'([\d.]+)\s*L/100', v); return 'Fuel Consumption', f'{m.group(1)} L/100 km' if m else v
    if key in ('engine oil capacity', 'fuel tank capacity'):
        return key.title().replace('Oil','Oil'), re.sub(r'(\d)L$', r'\1 L', v)
    if key == 'co₂ emissions': return 'CO₂ Emissions', re.sub(r'(\d)g/km', r'\1 g/km', v)
    if key == 'ground clearance': return 'Ground Clearance', re.sub(r'(\d)\s*in$', r'\1 in', v, flags=re.I)
    return key.title(), v

def parse_price(s):
    t = s.strip()
    if t.upper() == 'SOLD': return None, False, 'sold', None
    if 'export' in t.lower():
        return None, False, 'available', 'Export from UAE — shipment available with 50% advance'
    m = re.search(r'\d[\d,]{4,}', t)
    return (int(m.group().replace(',', '')) if m else None), 'negotiable' in t.lower(), 'available', None

def parse(v):
    vid = v['id']
    price, negotiable, status, price_note = parse_price(v['price_ksh'])
    name = pretty_name(v['name'], vid)
    make = name.split()[0]
    model = MODEL_OVERRIDE.get(vid) or ' '.join(case_word(w) for w in v['model'].split())
    fuel_raw = v['fuel'].lower()
    fuel = 'Hybrid' if 'hybrid' in fuel_raw and not fuel_raw.startswith('non') and 'non-' not in fuel_raw \
        else 'Petrol' if 'non' in fuel_raw else v['fuel'].strip().title()
    body = next((b for k, b in BODY if k in (model + ' ' + name).lower()), v['type'])

    year = None; mileage = None; seats = None; drive = None; trans = None; engine_no = None; note = None
    conds, feats, specs = [], [], {}
    cond_text = v['condition_type'].replace('Front, Transverse', 'Front/Transverse')
    toks = [t.strip() for t in re.split(r',|->|\n', cond_text) if t.strip()]
    for t in toks:
        k = t.lower().strip(' .')
        if k in ('for more info contact us',): continue
        if "serious buyer" in k: note = 'Serious buyers only'; continue
        m = re.fullmatch(r'(2|4)\s*wd|awd|zwd', k)
        if m: drive = 'AWD' if k == 'awd' else ('4WD' if k.startswith('4') else '2WD'); continue
        m = re.search(r'y\.?\s?o\.?\s?m\.?\s*(\d{4})', k)
        if m: year = int(m.group(1)); continue
        m = re.search(r'(\d+)\s*k\s*mileage', k) or re.search(r'(?:mileage|milage|millage)\s*(\d+)\s*k\b', k)
        if m: mileage = int(m.group(1)) * 1000; continue
        m = re.search(r'(?:mileage|milage|millage)\s*(\d+)\s*(?:km|kms)?', k) or re.search(r'(\d{4,6})\s*kms', k)
        if m: mileage = int(m.group(1)); continue
        m = re.search(r'(\d+)\s*seater', k)
        if m: seats = int(m.group(1)); continue
        if k.startswith('engine no'): engine_no = t.split(':', 1)[1].strip(); continue
        if k.startswith('commuter registration year'): feats.append('Commuter Registration ' + t.split(':')[1].strip()); continue
        if '1nz-fxe' in k: specs['Engine'] = '1.5L 1NZ-FXE 4-cylinder petrol with Hybrid Synergy Drive'; continue
        if k.startswith('turbo charged'): feats += ['Turbocharged', '1KD Engine']; trans = 'Automatic'; continue
        if k in ('automatic', 'automatic transmission', 'automatic gear'): trans = 'Automatic'; continue
        if k == 'manual': trans = 'Manual'; continue
        if '5-speed manual' in k: trans = 'Manual (5-speed)'; continue
        if k in MULTI:
            if 'automatic' in k: trans = 'Automatic'
            feats += MULTI[k]; continue
        if k in CONDITION: conds.append(CONDITION[k]); continue
        if ':' in t:
            key, val = [x.strip() for x in t.split(':', 1)]
            if key.lower() == 'transmission': trans = val.strip().rstrip('.').upper() if val.lower() == 'cvt' else val.title(); continue
            label, value = fmt_spec(key.lower(), val); specs[label] = value; continue
        feats.append(FEAT.get(k) or (t.title() if t.isupper() else t[:1].upper() + t[1:]))
    if 'hybrid z' in v['fuel'].lower(): specs = {'Grade': 'Hybrid Z', **specs}
    if year is None:
        m = re.search(r'\b(19|20)\d{2}\b', name) or re.search(r'\b(20\d{2})/\d', v['make'])
        year = int(m.group(0)[:4]) if m else None
    cc = re.search(r'(\d{3,4})\s*cc', name, re.I)
    seen = set(); feats = [f for f in feats if not (f in seen or seen.add(f))]
    condition = next((c for c in CONDITION_RANK if c in conds), 'Used')
    imgs = list(dict.fromkeys(v['images']))
    rec = {'id': vid, 'name': name, 'make': make, 'model': model, 'body': body, 'fuel': fuel, 'status': status,
           'price': price, 'negotiable': negotiable, 'price_note': price_note, 'condition': condition,
           'year': year, 'engine_cc': int(cc.group(1)) if cc else None, 'mileage_km': mileage,
           'transmission': trans, 'drive': drive, 'seats': seats, 'features': feats, 'specs': specs or None,
           'note': note, 'engine_no': engine_no, 'images': imgs,
           'contact_phone': v['contact_phone'].strip(), 'contact_email': v['contact_email'].strip()}
    return {k: x for k, x in rec.items() if x not in (None, {}, [] ) or k in ('features', 'negotiable')}

out = [parse(v) for v in json.load(open(SRC, encoding='utf-8'))]
json.dump(out, open(DST, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print(f'{len(out)} vehicles -> {DST}')

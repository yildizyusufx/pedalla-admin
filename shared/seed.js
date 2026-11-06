// Demo data (fictional). Run once on an empty database.
import { today, addDays } from './api.js';

export function seed(api, hashPassword) {
  const { db } = api;
  if (db.get('SELECT COUNT(*) AS n FROM users').n > 0) return false;
  let s = 42; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const T = today();
  const ins = (sql, p) => db.run(sql, p).lastId;

  db.tx(() => {
    // users
    const users = [
      ['Yusuf Yıldız', 'admin@pedalla.bike', 'admin'],
      ['Lena Becker', 'operasyon@pedalla.bike', 'operasyon'],
      ['Mehmet Kaya', 'servis@pedalla.bike', 'servis'],
      ['Sophie Wagner', 'muhasebe@pedalla.bike', 'muhasebe'],
      ['Jonas Schulz', 'servis2@pedalla.bike', 'servis'],
    ].map(([n, e, r]) => ins('INSERT INTO users(name,email,role,password_hash) VALUES(?,?,?,?)', [n, e, r, hashPassword('pedalla123')]));
    const techs = [users[2], users[4]];

    // pricing plans
    const plans = [
      ['Lastenrad Günlük', 'Kargo bisikleti (Lastenrad)', 'gün', 39, 200],
      ['Lastenrad Haftalık', 'Kargo bisikleti (Lastenrad)', 'hafta', 149, 300],
      ['Lastenrad Aylık (kurye)', 'Kargo bisikleti (Lastenrad)', 'ay', 289, 500],
      ['E-Kargo Aylık (kurye)', 'E-Kargo bisikleti', 'ay', 349, 750],
      ['E-Kargo Haftalık', 'E-Kargo bisikleti', 'hafta', 179, 500],
      ['E-Bike Aylık', 'E-Bike', 'ay', 129, 300],
      ['E-Bike Günlük', 'E-Bike', 'gün', 25, 150],
    ].map((p) => ({ id: ins('INSERT INTO pricing_plans(name,bike_type,period,price,deposit) VALUES(?,?,?,?,?)', p), type: p[1], period: p[2], price: p[3], deposit: p[4] }));

    // suppliers & parts
    const sup = [
      ['Velo Teile Nord GmbH', 'Frank Meier', '+49 40 5550101', 'order@veloteile-nord.example', 3],
      ['Cargo Components B.V.', 'Anouk de Vries', '+31 20 5550144', 'sales@cargocomp.example', 7],
      ['E-Antrieb Service KG', 'Tim Roth', '+49 40 5550177', 'service@e-antrieb.example', 5],
      ['Reifen Hansa', 'Petra Holm', '+49 40 5550190', 'info@reifen-hansa.example', 2],
    ].map((x) => ins('INSERT INTO suppliers(name,contact,phone,email,lead_days) VALUES(?,?,?,?,?)', x));
    const partsData = [
      ['BRK-PAD-01', 'Disk fren balatası (çift)', 'fren', 'Tüm modeller', 9.5, 19, 24, 10, 'A1', sup[0]],
      ['BRK-DSC-180', 'Fren diski 180 mm', 'fren', 'E-Kargo', 18, 35, 8, 4, 'A1', sup[0]],
      ['BRK-HYD-OIL', 'Hidrolik fren yağı 100 ml', 'fren', 'Tüm modeller', 6, 12, 3, 4, 'A2', sup[0]],
      ['TYR-20-CRG', 'Dış lastik 20" kargo, sağlam', 'lastik/jant', 'Lastenrad ön', 22, 42, 14, 6, 'B1', sup[3]],
      ['TYR-26-CRG', 'Dış lastik 26" kargo', 'lastik/jant', 'Lastenrad arka', 24, 45, 9, 6, 'B1', sup[3]],
      ['TUB-20', 'İç lastik 20"', 'lastik/jant', 'Lastenrad ön', 4.5, 9, 30, 12, 'B2', sup[3]],
      ['TUB-26', 'İç lastik 26"', 'lastik/jant', 'Lastenrad arka', 4.5, 9, 5, 12, 'B2', sup[3]],
      ['TUB-28', 'İç lastik 28"', 'lastik/jant', 'E-Bike', 4.5, 9, 18, 8, 'B2', sup[3]],
      ['CHN-11S', 'Zincir 11 vites', 'zincir/aktarma', 'E-Bike, Lastenrad', 21, 39, 12, 5, 'C1', sup[0]],
      ['BLT-CDX', 'Karbon kayış (belt)', 'zincir/aktarma', 'E-Kargo', 65, 119, 2, 3, 'C1', sup[1]],
      ['CST-11-42', 'Kaset 11-42', 'zincir/aktarma', 'E-Bike', 38, 69, 6, 3, 'C2', sup[0]],
      ['DRL-SHM', 'Arka aktarıcı', 'zincir/aktarma', 'Lastenrad', 42, 79, 4, 2, 'C2', sup[0]],
      ['BAT-500', 'Batarya 500 Wh', 'batarya', 'E-Kargo, E-Bike', 420, 690, 3, 2, 'D1 (kilitli)', sup[2]],
      ['BAT-CHG', 'Şarj cihazı 4A', 'batarya', 'E-Kargo, E-Bike', 75, 129, 5, 3, 'D1', sup[2]],
      ['MTR-HUB', 'Arka göbek motoru 250 W', 'motor/elektrik', 'E-Kargo', 310, 520, 1, 1, 'D2', sup[2]],
      ['DSP-KIOX', 'Ekran / kumanda ünitesi', 'motor/elektrik', 'E-Kargo, E-Bike', 95, 169, 4, 2, 'D2', sup[2]],
      ['CBL-SPD', 'Hız sensörü + kablo', 'motor/elektrik', 'E-Kargo, E-Bike', 18, 35, 7, 3, 'D2', sup[2]],
      ['LGT-FRT', 'Ön far LED 70 lux', 'ışık', 'Tüm modeller', 24, 45, 11, 4, 'E1', sup[0]],
      ['LGT-REAR', 'Arka stop lambası', 'ışık', 'Tüm modeller', 9, 19, 16, 4, 'E1', sup[0]],
      ['BOX-LID', 'Kargo kutusu kapağı', 'kargo kutusu', 'Lastenrad', 85, 149, 3, 2, 'F1', sup[1]],
      ['BOX-LCK', 'Kargo kutusu kilidi', 'kargo kutusu', 'Lastenrad, E-Kargo', 19, 35, 1, 4, 'F1', sup[1]],
      ['BOX-RAIN', 'Yağmur brandası', 'kargo kutusu', 'Lastenrad', 39, 69, 7, 3, 'F2', sup[1]],
      ['STD-CRG', 'Çift ayaklık (sehpa)', 'gidon/sele', 'Lastenrad', 48, 89, 3, 2, 'G1', sup[1]],
      ['SDL-CMF', 'Konfor sele', 'gidon/sele', 'Tüm modeller', 22, 39, 9, 3, 'G1', sup[0]],
      ['GRP-ERG', 'Ergonomik elcik (çift)', 'gidon/sele', 'Tüm modeller', 12, 25, 14, 4, 'G2', sup[0]],
      ['LCK-ABUS', 'Katlanır kilit', 'aksesuar', 'Tüm modeller', 45, 79, 6, 4, 'H1', sup[0]],
      ['GPS-TRK', 'GPS takip modülü (LTE)', 'aksesuar', 'Tüm modeller', 59, 0, 4, 3, 'H2', sup[2]],
    ];
    const parts = partsData.map((p) => {
      const id = ins('INSERT INTO parts(sku,name,category,compatible,cost,price,stock,min_stock,location,supplier_id) VALUES(?,?,?,?,?,?,?,?,?,?)', p);
      db.run("INSERT INTO stock_moves(part_id,date,type,qty,unit_cost,ref,user_id,notes) VALUES(?,?,'giriş',?,?,?,?,?)", [id, addDays(T, -300), p[6] + 10, p[4], 'Açılış stoğu', users[0], 'İlk sayım']);
      return { id, cost: p[4], price: p[5] };
    });

    // customers & riders
    const custData = [
      ['kurumsal', 'Kerstin Vogel', 'Elbe Kurier GmbH', 'DE298765431', 'dispo@elbe-kurier.example', '+49 40 5551001', 'Holstenstraße 12, 22767 Hamburg', 'Hamburg'],
      ['kurumsal', 'Ali Demir', 'Alster Express UG', 'DE312345678', 'ali@alster-express.example', '+49 40 5551002', 'Steindamm 45, 20099 Hamburg', 'Hamburg'],
      ['kurumsal', 'Nina Hoffmann', 'GreenMile Logistik GmbH', 'DE301112223', 'fleet@greenmile.example', '+49 40 5551003', 'Wendenstraße 130, 20537 Hamburg', 'Hamburg'],
      ['kurumsal', 'Paul Neumann', 'Hafen Bäckerei Neumann', 'DE287776665', 'paul@hafenbaeckerei.example', '+49 40 5551004', 'Ottenser Hauptstr. 8, 22765 Hamburg', 'Hamburg'],
      ['kurumsal', 'Fatma Şahin', 'Blitzbote Lieferdienst', 'DE305554443', 'office@blitzbote.example', '+49 40 5551005', 'Bramfelder Str. 70, 22305 Hamburg', 'Hamburg'],
      ['bireysel', 'Lukas Weber', null, null, 'lukas.weber@mail.example', '+49 176 5551006', 'Bahrenfelder Str. 99, 22765 Hamburg', 'Hamburg'],
      ['bireysel', 'Emma Fischer', null, null, 'emma.f@mail.example', '+49 176 5551007', 'Eppendorfer Weg 30, 20259 Hamburg', 'Hamburg'],
      ['kurumsal', 'Marco Rossi', 'Pizza Rapido Altona', 'DE299988877', 'marco@pizzarapido.example', '+49 40 5551008', 'Große Bergstr. 200, 22767 Hamburg', 'Hamburg'],
      ['bireysel', 'Tobias Krüger', null, null, 'tobi.k@mail.example', '+49 176 5551009', 'Barmbeker Str. 5, 22303 Hamburg', 'Hamburg'],
    ];
    const customers = custData.map((c, i) => ins('INSERT INTO customers(type,name,company_name,tax_no,email,phone,address,city,id_verified,blacklisted,iban) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [...c, 1, i === 8 ? 1 : 0, `DE89 3704 0044 0532 0130 ${String(10 + i).padStart(2, '0')}`]));
    db.run("UPDATE customers SET notes='İki kez ödeme gecikmesi ve iade edilmeyen kilit. Yeni kiralama yapılmasın.' WHERE id=?", [customers[8]]);
    const riderNames = ['Kemal Arslan', 'Jan Petersen', 'Mia Schröder', 'Omar Haddad', 'Leon Wolf', 'Sara Yılmaz', 'Felix Braun', 'Lea Zimmermann', 'Can Öztürk', 'Tim Hartmann', 'Hannah König', 'David Lang', 'Elif Koç', 'Max Richter', 'Julia Klein', 'Ben Wójcik', 'Ayşe Çelik', 'Noah Krause'];
    const riderCust = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 4, 4, 4, 7, 7, 2];
    const riders = riderNames.map((n, i) => ({ id: ins('INSERT INTO riders(customer_id,name,phone,trained,active) VALUES(?,?,?,?,1)', [customers[riderCust[i]], n, `+49 15${i % 10} 555${2000 + i}`, rnd() > 0.2 ? 1 : 0]), c: riderCust[i] }));
    riderCust.forEach(() => {});
    // individual customers ride themselves
    for (const ci of [5, 6, 8]) riders.push({ id: ins('INSERT INTO riders(customer_id,name,phone,trained) VALUES(?,?,?,1)', [customers[ci], custData[ci][1], custData[ci][5]]), c: ci });

    // bikes
    const models = [
      ['Kargo bisikleti (Lastenrad)', 'Urban Arrow', 'Cargo L', 2600],
      ['Kargo bisikleti (Lastenrad)', 'Bullitt', 'Classic', 2400],
      ['E-Kargo bisikleti', 'Riese & Müller', 'Load 75', 7900],
      ['E-Kargo bisikleti', 'Tern', 'GSD S10', 5900],
      ['E-Kargo bisikleti', 'Douze', 'G4e', 6800],
      ['E-Bike', 'Cube', 'Kathmandu Hybrid', 2900],
      ['E-Bike', 'Gazelle', 'Ultimate C380', 3400],
    ];
    const spots = [
      ['Altona', 53.5503, 9.9353], ['Ottensen', 53.5541, 9.9274], ['St. Pauli', 53.5560, 9.9620], ['Eimsbüttel', 53.5747, 9.9578],
      ['Winterhude', 53.5917, 10.0011], ['Barmbek', 53.5854, 10.0444], ['HafenCity', 53.5413, 9.9984], ['St. Georg', 53.5554, 10.0124],
      ['Eppendorf', 53.5895, 9.9840], ['Rothenburgsort', 53.5354, 10.0400], ['Wilhelmsburg', 53.4986, 10.0068], ['Bahrenfeld', 53.5655, 9.9067],
    ];
    const depot = ['Depo Stresemannstraße', 53.5636, 9.9425];
    const bikes = [];
    for (let i = 0; i < 26; i++) {
      const m = models[i < 8 ? i % 2 : i < 20 ? 2 + (i % 3) : 5 + (i % 2)];
      const year = 2023 + (i % 3);
      const bid = ins(`INSERT INTO bikes(code,type,brand,model,frame_no,battery_no,gps_tracker_id,color,year,purchase_date,purchase_price,status,location_name,lat,lng,battery_level,last_seen,odometer_km,insurance_no,insurance_until,last_service_date,next_service_date)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [`PED-${String(i + 1).padStart(3, '0')}`, m[0], m[1], m[2], `WAN${year}${String(73000 + i * 37)}`,
        m[0] === 'Kargo bisikleti (Lastenrad)' ? null : `BAT-${88000 + i}`, `TRK-${4100 + i}`, pick(['siyah', 'Pedalla yeşili', 'beyaz', 'antrasit']), year,
        addDays(T, -500 + i * 9), m[3], 'müsait', depot[0], depot[1] + (rnd() - 0.5) * 0.0008, depot[2] + (rnd() - 0.5) * 0.0012,
        m[0] === 'Kargo bisikleti (Lastenrad)' ? null : 60 + Math.round(rnd() * 40), addDays(T, 0) + ' 08:00:00', Math.round(400 + rnd() * 4200),
        `HV-${770000 + i}`, addDays(T, i === 3 ? 18 : 120 + i * 5), addDays(T, -40 - i * 3), addDays(T, i % 7 === 0 ? -3 : 20 + i * 4)]);
      bikes.push({ id: bid, type: m[0] });
    }

    // rentals: history + active
    const planFor = (type, period) => plans.find((p) => p.type === type && p.period === period) || plans.find((p) => p.type === type);
    const mkRental = ({ bike, cust, rider, start, end, period, status, returned, damage, condition, depositPaid = true }) => {
      const plan = planFor(bike.type, period);
      const year = start.slice(0, 4);
      const n = (db.get("SELECT COUNT(*) AS n FROM rentals WHERE contract_no LIKE ?", [`K-${year}-%`]).n || 0) + 1;
      const id = ins(`INSERT INTO rentals(contract_no,customer_id,rider_id,bike_id,plan_id,start_date,end_date,period,rate,deposit_amount,deposit_status,status,start_km,start_battery,accessories,created_by)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [`K-${year}-${String(n).padStart(4, '0')}`, customers[cust], rider, bike.id, plan.id, start, end, plan.period, plan.price, plan.deposit,
        depositPaid ? 'alındı' : 'bekliyor', 'aktif', 500, 100, 'Kilit x1, şarj cihazı x1, yağmur brandası x1', users[1]]);
      if (depositPaid) db.run("INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,'tahsil',?,'Teslimde alındı')", [id, customers[cust], start, plan.deposit]);
      api.billRental(id, null, returned || T);
      if (status === 'tamamlandı') {
        db.run("UPDATE rentals SET status='tamamlandı', returned_at=?, end_km=?, return_condition=?, damage_fee=?, deposit_status='iade edildi' WHERE id=?", [returned, 500 + Math.round(rnd() * 900), condition || 'Sorunsuz iade', damage || 0, id]);
        db.run("INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,'iade',?,'İadede geri ödendi')", [id, customers[cust], returned, plan.deposit]);
      }
      return id;
    };
    const ridersOf = (ci) => riders.filter((r) => r.c === ci).map((r) => r.id);
    let bi = 0;
    // completed history
    for (let k = 0; k < 16; k++) {
      const ci = [0, 1, 2, 3, 4, 5, 6, 7, 8][k % 9]; const bike = bikes[(k * 5) % bikes.length];
      const start = addDays(T, -330 + k * 15); const period = ci >= 5 && ci !== 7 ? 'hafta' : 'ay';
      const end = addDays(start, period === 'hafta' ? 27 : 89);
      const returned = k === 4 ? addDays(end, 3) : end;
      mkRental({ bike, cust: ci, rider: pick(ridersOf(ci)), start, end, period, status: 'tamamlandı', returned, damage: k === 6 ? 180 : 0, condition: k === 6 ? 'Kargo kutusu kapağı kırık' : null });
      if (k === 6) ins('INSERT INTO invoices(invoice_no,rental_id,customer_id,issue_date,due_date,description,net,vat_rate,vat,total,status) VALUES(?,?,?,?,?,?,?,19,?,?,?)',
        [`F-${returned.slice(0, 4)}-H${k}`, null, customers[ci], returned, addDays(returned, 14), 'Hasar bedeli: kargo kutusu kapağı', 180, 34.2, 214.2, 'açık']);
    }
    // active rentals (fleet in use)
    const active = [
      [0, 2, -150, 210, 'ay'], [0, 3, -120, 240, 'ay'], [0, 4, -95, 270, 'ay'], [0, 0, -60, 120, 'ay'],
      [1, 5, -80, 100, 'ay'], [1, 6, -45, 135, 'ay'], [1, 1, -20, -2, 'hafta'],
      [2, 7, -200, 165, 'ay'], [2, 8, -170, 195, 'ay'], [2, 9, -140, 40, 'ay'], [2, 10, -30, 150, 'ay'],
      [3, 11, -75, 15, 'ay'], [4, 12, -110, 70, 'ay'], [4, 13, -50, -5, 'ay'], [4, 14, -15, 75, 'ay'],
      [5, 20, -10, 4, 'hafta'], [6, 21, -40, 140, 'ay'], [7, 15, -65, 25, 'ay'],
    ];
    const activeIds = [];
    for (const [ci, bIdx, s0, e0, period] of active) {
      const bike = bikes[bIdx]; const rs = ridersOf(ci);
      const id = mkRental({ bike, cust: ci, rider: rs[activeIds.length % rs.length], start: addDays(T, s0), end: addDays(T, e0), period, status: 'aktif', depositPaid: !(ci === 7) });
      activeIds.push(id);
      const sp = spots[(bIdx * 7) % spots.length];
      const lat = sp[1] + (rnd() - 0.5) * 0.01; const lng = sp[2] + (rnd() - 0.5) * 0.016;
      const noSignal = bIdx === 9;
      db.run("UPDATE bikes SET status='kirada', location_name=?, lat=?, lng=?, last_seen=? WHERE id=?", [sp[0], lat, lng, noSignal ? addDays(T, -2) + ' 17:40:00' : T + ' ' + String(8 + Math.floor(rnd() * 4)).padStart(2, '0') + ':' + String(Math.floor(rnd() * 59)).padStart(2, '0') + ':00', bike.id]);
      if (bike.type !== 'Kargo bisikleti (Lastenrad)') db.run('UPDATE bikes SET battery_level=? WHERE id=?', [bIdx === 13 ? 12 : 25 + Math.round(rnd() * 70), bike.id]);
      // short GPS track
      let la = lat, ln = lng;
      for (let h = 0; h < 24; h++) { la += (rnd() - 0.5) * 0.003; ln += (rnd() - 0.5) * 0.005; db.run('INSERT INTO bike_locations(bike_id,ts,lat,lng,battery,speed) VALUES(?,?,?,?,?,?)', [bike.id, `${T} ${String(Math.floor(h / 3) + 6).padStart(2, '0')}:${String((h % 3) * 20).padStart(2, '0')}:00`, la, ln, 80 - h, Math.round(rnd() * 20)]); }
    }
    // a reservation
    db.run(`INSERT INTO rentals(contract_no,customer_id,rider_id,bike_id,plan_id,start_date,end_date,period,rate,deposit_amount,deposit_status,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [`K-${T.slice(0, 4)}-R001`, customers[3], ridersOf(3)[0], bikes[16].id, planFor(bikes[16].type, 'hafta').id, addDays(T, 3), addDays(T, 17), 'hafta', 179, 500, 'bekliyor', 'rezervasyon', users[1]]);
    db.run("UPDATE bikes SET status='rezerve' WHERE id=?", [bikes[16].id]);

    // payments: pay everything except recent ones and specific late payers
    const latePayers = new Set([customers[1], customers[4], customers[8]]);
    for (const inv of db.all('SELECT * FROM invoices ORDER BY issue_date')) {
      const ageDays = Math.round((new Date(T) - new Date(inv.issue_date)) / 864e5);
      let pay = ageDays > 10;
      if (latePayers.has(inv.customer_id) && ageDays < 75) pay = false;
      if (inv.invoice_no.includes('-H')) pay = false;
      if (!pay) continue;
      const amt = latePayers.has(inv.customer_id) && ageDays < 120 && rnd() > 0.6 ? Math.round(inv.total * 0.5 * 100) / 100 : inv.total;
      db.run('INSERT INTO payments(invoice_id,customer_id,date,amount,method,reference) VALUES(?,?,?,?,?,?)', [inv.id, inv.customer_id, addDays(inv.issue_date, 3 + Math.floor(rnd() * 12)), amt, pick(['SEPA otomatik ödeme', 'banka havalesi', 'banka havalesi', 'kredi kartı']), `TRX${100000 + inv.id}`]);
      const paid = db.get('SELECT SUM(amount) AS s FROM payments WHERE invoice_id=?', [inv.id]).s;
      db.run('UPDATE invoices SET paid_amount=?, status=? WHERE id=?', [paid, paid + 0.005 >= inv.total ? 'ödendi' : 'kısmi', inv.id]);
    }
    db.run("UPDATE invoices SET reminders_sent=1, last_reminder_at=? WHERE status IN ('açık','kısmi') AND due_date < ?", [addDays(T, -5) + ' 10:00:00', addDays(T, -10)]);

    // service history
    const complaints = [
      ['periyodik bakım', 'Periyodik bakım (90 gün)', 'Fren balataları ve zincir kontrol edildi, ayar yapıldı.', [[0, 1], [8, 1]], 1.5],
      ['arıza', 'Arka lastik sürekli iniyor', 'İç lastik ve dış lastik değiştirildi.', [[6, 1], [4, 1]], 0.75],
      ['arıza', 'Motor desteği kesik kesik geliyor', 'Hız sensörü kablosu değiştirildi, yazılım güncellendi.', [[16, 1]], 1],
      ['hasar', 'Kaza sonrası ön far kırık, gidon eğik', 'Ön far değişti, gidon düzeltildi.', [[17, 1], [24, 1]], 1.25],
      ['periyodik bakım', 'Periyodik bakım + kayış kontrolü', 'Kayış gerginliği ayarlandı, frenler hava alındı.', [[2, 1], [0, 1]], 1.5],
      ['arıza', 'Kargo kutusu kilidi açılmıyor', 'Kilit değiştirildi.', [[20, 1]], 0.5],
    ];
    for (let k = 0; k < 14; k++) {
      const c = complaints[k % complaints.length]; const bike = bikes[(k * 3 + 1) % bikes.length];
      const rec = addDays(T, -280 + k * 19);
      const no = `S-${rec.slice(0, 4)}-${String(k + 1).padStart(4, '0')}`;
      const sid = ins(`INSERT INTO service_orders(order_no,bike_id,type,status,received_at,received_by,brought_by,km,battery_level,complaint,checklist,visual_condition,accessories,estimated_cost,estimated_ready,technician_id,diagnosis,work_done,labor_hours,labor_rate,billable,signature_name,delivered_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [no, bike.id, c[0], 'teslim edildi', rec + ' 09:30:00', users[1], 'Filo operasyonu', 800 + k * 120, 70, c[1], '{}', 'Genel kullanım izleri', 'Şarj cihazı', 90, addDays(rec, 2), pick(techs), c[2], c[2], c[4], 55, 0, 'Lena Becker', addDays(rec, 2) + ' 16:00:00']);
      for (const [pi, q] of c[3]) {
        db.run('INSERT INTO service_parts(service_id,part_id,qty,unit_price) VALUES(?,?,?,?)', [sid, parts[pi].id, q, parts[pi].price]);
        db.run("INSERT INTO stock_moves(part_id,date,type,qty,unit_cost,ref,service_id,user_id) VALUES(?,?,'çıkış',?,?,?,?,?)", [parts[pi].id, addDays(rec, 1), q, parts[pi].cost, no, sid, techs[0]]);
      }
    }
    // open service orders
    const open = [
      [17, 'arıza', 'onarımda', 'Motor çalışmıyor, ekranda hata kodu 503', 1, 'Motor göbeği arızalı, değişim gerekiyor.', [[14, 1]]],
      [18, 'hasar', 'parça bekliyor', 'Kargo kutusu kilidi kırık, kapak çatlak', 0, 'Kilit stokta tükendi, sipariş verildi.', []],
      [19, 'periyodik bakım', 'kabul edildi', '90 günlük periyodik bakım', 0, null, []],
      [22, 'arıza', 'hazır', 'Ön fren ses yapıyor', 2, 'Balatalar bitmiş.', [[0, 1]]],
    ];
    open.forEach(([bIdx, type, status, complaint, est, diag, ps], k) => {
      const bike = bikes[bIdx];
      db.run('UPDATE bikes SET status=? WHERE id=?', [bIdx === 17 ? 'arızalı' : 'serviste', bike.id]);
      const sid = ins(`INSERT INTO service_orders(order_no,bike_id,customer_id,type,status,received_at,received_by,brought_by,km,battery_level,complaint,checklist,visual_condition,accessories,estimated_cost,estimated_ready,technician_id,diagnosis,labor_hours,labor_rate,billable,signature_name)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [`S-${T.slice(0, 4)}-${String(30 + k).padStart(4, '0')}`, bike.id, k === 1 ? customers[2] : null, type, status, addDays(T, -4 + k) + ' 10:15:00', users[1],
        k === 1 ? 'Nina Hoffmann (GreenMile)' : 'Filo operasyonu', 2100 + k * 300, 55, complaint, JSON.stringify({ 'Frenler (ön/arka)': k === 3 ? 'sorun' : 'ok', 'Lastikler ve hava basıncı': 'ok', 'Kargo kutusu / kilit': k === 1 ? 'sorun' : 'ok' }),
        k === 1 ? 'Kapakta 15 cm çatlak, sol yanda çizik' : 'Normal kullanım izleri', 'Anahtar x2', [520, 180, 90, 40][k], addDays(T, est - (k === 1 ? 4 : 0)), techs[k % 2], diag, k === 0 ? 1 : k === 3 ? 0.5 : 0, 55, k === 1 ? 1 : 0, k === 1 ? 'Nina Hoffmann' : 'Lena Becker']);
      for (const [pi, q] of ps) {
        db.run('INSERT INTO service_parts(service_id,part_id,qty,unit_price) VALUES(?,?,?,?)', [sid, parts[pi].id, q, parts[pi].price]);
        db.run("INSERT INTO stock_moves(part_id,date,type,qty,unit_cost,ref,service_id,user_id) VALUES(?,?,'çıkış',?,?,?,?,?)", [parts[pi].id, T, q, parts[pi].cost, `S-${T.slice(0, 4)}-${String(30 + k).padStart(4, '0')}`, sid, techs[0]]);
      }
    });
    db.run("UPDATE bikes SET status='hizmet dışı', notes='Şasi çatlağı – hurdaya ayrılacak' WHERE id=?", [bikes[25].id]);
    // sequence counters
    const y = T.slice(0, 4);
    for (const [p, n] of [['K', 40], ['S', 40]]) db.run('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', [`seq_${p}_${y}`, String(n)]);
    db.run("INSERT OR REPLACE INTO settings(key,value) VALUES('telemetry_key','demo-tracker-key')");
    api.audit({ id: users[0] }, 'kurulum', 'system', null, 'Demo verileri yüklendi');
  });
  return true;
}

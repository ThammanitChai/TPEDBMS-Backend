require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Sale = require('../models/Sale');

// Sales data from spreadsheet (BE 2569 = CE 2026)
const RAW_DATA = [
  { date: '2026-01-08', customerName: 'ลูกค้าพัฒแอม พระราม 2', province: 'สมุทรสาคร', product: 'ปั๊มจุ่ม', quantity: 2, amount: 8000, customerType: 'ลูกค้าหน่วยงาน', hasDelivery: true, notes: '' },
  { date: '2026-01-10', customerName: 'พฤกษลดา สาย4', province: 'สมุทรสาคร', product: 'WQ200BC', quantity: 1, amount: 9000, customerType: 'หมู่บ้าน', hasDelivery: true, notes: '' },
  { date: '2026-01-23', customerName: 'บริษัท ส.เจริญชัย ค้าวัสดุก่อสร้าง จำกัด', province: 'ชลบุรี', product: 'LA370(2)/LA550', quantity: 12, amount: 29726.37, customerType: 'ร้านค้าMALLเล็ก', hasDelivery: true, notes: '' },
  { date: '2026-02-05', customerName: 'ช่างหนุ่ม ยุทธศักดิ์', province: 'นนทบุรี', product: 'LS1500', quantity: 1, amount: 3996, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-02-05', customerName: 'GURU ปั๊มน้ำ คุณชูชาติ', province: 'ปทุมธานี', product: 'DCM130(2)', quantity: 2, amount: 3580, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: 'เปิดเป็นร้าน' },
  { date: '2026-02-06', customerName: 'สมาชิกช่าง กิตติพงษ์ สาครสุขศรีฤกษ์', province: 'กทม.', product: 'เสื้อปั๊ม TQ200', quantity: 1, amount: 593, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-02-06', customerName: 'สมาชิกช่าง วินัย', province: 'นครปฐม', product: 'AMPC', quantity: 1, amount: 688.8, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-02-11', customerName: 'กันยงโฮมสโตร์', province: 'ชลบุรี', product: 'LA550', quantity: 1, amount: 1660, customerType: 'ร้านค้าMALLเล็ก', hasDelivery: true, notes: '' },
  { date: '2026-02-12', customerName: 'คุณเกษม ก.เจริญการไฟฟ้า', province: 'กรุงเทพ', product: 'AMPC', quantity: 10, amount: 5900, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: 'เปิดเป็นร้าน' },
  { date: '2026-02-20', customerName: 'คุณอรประภา', province: 'นครปฐม', product: 'WQ400BC', quantity: 1, amount: 12390, customerType: 'โครงการหมู่บ้าน', hasDelivery: true, notes: '' },
  { date: '2026-02-23', customerName: 'คุณวชิระ เนตรวงษ์', province: 'กรุงเทพ', product: 'WQ200BC', quantity: 1, amount: 9990, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-02', customerName: 'โกศล พุทธเจริญลาภ', province: 'นครสวรรค์', product: 'อะไหล่ TP825', quantity: 2, amount: 342, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-04', customerName: 'คุณสุรชาติ', province: 'กรุงเทพ', product: 'HM4-6', quantity: 1, amount: 6450, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-06', customerName: 'ชัยรัตน์ สระเสียงดี', province: 'กรุงเทพ', product: 'WQ400+pp', quantity: 1, amount: 24990, customerType: 'หมู่บ้าน', hasDelivery: true, notes: '' },
  { date: '2026-03-06', customerName: 'คุณเสน่ห์ จงกลนี', province: 'ปทุมธานี', product: 'PW400AD', quantity: 1, amount: 4163, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-07', customerName: 'คุณอธิภัทร', province: 'กรุงเทพ', product: 'WQ400BC', quantity: 1, amount: 12640, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-08', customerName: 'คุณวชิระ เนตรวงษ์', province: 'กรุงเทพ', product: 'WQ200BC', quantity: 1, amount: 9990, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-08', customerName: 'คุณวชิระ เนตรวงษ์', province: 'กรุงเทพ', product: 'WQ400BC', quantity: 1, amount: 12390, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
  { date: '2026-03-09', customerName: 'รุ่งเรือง พรชัยเรืองเดช', province: 'กรุงเทพ', product: 'อะไหล่ TP820', quantity: 1, amount: 1260, customerType: 'สมาชิกช่าง', hasDelivery: true, notes: '' },
];

const seedSales = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create new sales user (skip if already exists)
    let salesUser = await User.findOne({ email: 'sales3@tpedbms.com' });
    if (!salesUser) {
      salesUser = await User.create({
        name: 'Sales User 3',
        email: 'sales3@tpedbms.com',
        password: 'sales123',
        role: 'sales',
        phone: '0800000003',
        isActive: true,
      });
      console.log(`✅ Created user: ${salesUser.name} (${salesUser.email})`);
    } else {
      console.log(`ℹ️  User already exists: ${salesUser.email}`);
    }

    // Remove old sale records for this user before re-seeding
    await Sale.deleteMany({ salesPerson: salesUser._id });

    const records = RAW_DATA.map((r) => ({
      ...r,
      date: new Date(r.date),
      salesPerson: salesUser._id,
    }));

    await Sale.insertMany(records);
    console.log(`✅ Inserted ${records.length} sale records`);

    const total = records.reduce((s, r) => s + r.amount, 0);
    console.log(`💰 Total amount: ${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`);
    console.log('');
    console.log('📧 Login credentials for new user:');
    console.log('   Email   : sales3@tpedbms.com');
    console.log('   Password: sales123');
    console.log('   (Admin สามารถเปลี่ยนชื่อได้ที่หน้า User Management)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedSales();

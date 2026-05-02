require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear
    await User.deleteMany({});
    await Customer.deleteMany({});

    // Create superadmin
    await User.create({
      name: 'Thammanit_Chai',
      email: 'thammanit@tpedbms.com',
      password: 'TPEDBMS_ADMIN',
      role: 'superadmin',
      phone: '0800000000',
    });

    // Create admin
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
      phone: '0800000001',
    });

    // Create sales
    const sales1 = await User.create({
      name: 'สมชาย ใจดี',
      email: 'somchai@company.com',
      password: 'sales123',
      role: 'sales',
      phone: '0811111111',
    });

    const sales2 = await User.create({
      name: 'สมหญิง รักงาน',
      email: 'somying@company.com',
      password: 'sales123',
      role: 'sales',
      phone: '0822222222',
    });

    // Create customers
    await Customer.create([
      {
        companyName: 'บริษัท ABC จำกัด',
        contactPerson: 'คุณวิชัย',
        phone: '021234567',
        email: 'contact@abc.com',
        address: '123 ถนนสุขุมวิท กรุงเทพ',
        location: { lat: 13.7563, lng: 100.5018 },
        followUpDetails: 'สนใจสินค้า A และ B กำลังพิจารณาราคา',
        status: 'prospect',
        salesPerson: sales1._id,
        visits: [
          {
            visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            notes: 'นำเสนอสินค้าครั้งแรก ลูกค้าสนใจ',
            status: 'completed',
          },
          {
            visitDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: 'ตอบคำถามเรื่องราคา',
            status: 'completed',
          },
        ],
      },
      {
        companyName: 'บริษัท XYZ จำกัด',
        contactPerson: 'คุณสมศรี',
        phone: '027654321',
        email: 'contact@xyz.com',
        address: '456 ถนนพหลโยธิน กรุงเทพ',
        location: { lat: 13.8, lng: 100.55 },
        followUpDetails: 'รออนุมัติงบประมาณ',
        status: 'lead',
        salesPerson: sales1._id,
        visits: [
          {
            visitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            notes: 'นำเสนอข้อมูลเบื้องต้น',
            status: 'completed',
          },
        ],
      },
      {
        companyName: 'บริษัท สยามเทค จำกัด',
        contactPerson: 'คุณมานพ',
        phone: '023456789',
        address: '789 ถนนสีลม กรุงเทพ',
        location: { lat: 13.728, lng: 100.534 },
        followUpDetails: 'ปิดการขายสำเร็จ มีโอกาสซื้อเพิ่ม',
        status: 'customer',
        salesPerson: sales2._id,
        visits: [
          {
            visitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            notes: 'เยี่ยมครั้งแรก',
            status: 'completed',
          },
          {
            visitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            notes: 'เซ็นสัญญา',
            status: 'completed',
          },
        ],
      },
    ]);

    console.log('✅ Seed completed!');
    console.log('👑 SuperAdmin: thammanit@tpedbms.com / TPEDBMS_ADMIN');
    console.log('📧 Admin: admin@company.com / admin123');
    console.log('📧 Sales: somchai@company.com / sales123');
    console.log('📧 Sales: somying@company.com / sales123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();

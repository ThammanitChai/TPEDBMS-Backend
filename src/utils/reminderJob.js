const cron = require('node-cron');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');

// Run every day at 8:00 AM - check for upcoming visits
const startReminderJob = (io) => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Running visit reminder job...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const customers = await Customer.find({
        nextVisitDate: { $gte: tomorrow, $lt: dayAfter },
      }).populate('salesPerson');

      for (const customer of customers) {
        const notif = await Notification.create({
          user: customer.salesPerson._id,
          title: 'เตือนการเยี่ยมลูกค้า',
          message: `พรุ่งนี้คุณมีนัดเยี่ยม ${customer.companyName}`,
          type: 'visit_reminder',
          relatedCustomer: customer._id,
        });

        if (io) {
          io.to(`user_${customer.salesPerson._id}`).emit('notification', notif);
        }
      }
      console.log(`✅ Sent ${customers.length} reminders`);
    } catch (error) {
      console.error('Reminder job error:', error);
    }
  });
};

module.exports = { startReminderJob };

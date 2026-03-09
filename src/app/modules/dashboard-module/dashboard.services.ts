import User from '../user-module/user.model';

const fetchDasboardPageData = async () => {
  const totalGuest = await User.countDocuments({ 'profile.role': 'guest' });
  const totalHost = await User.countDocuments({ 'profile.role': 'host' });
  const adminIncome = 5800;
  const totalBooking = 8;

  return {
    stats: {
      totalGuest,
      totalHost,
      adminIncome,
      totalBooking,
    },
  };
};

const getRecentUsers = async () => {
  const users = await User.find().sort({ createdAt: -1 }).limit(3).populate({
    path: 'profile.id',
    select: '-password -verification -__v',
  });

  const newUsers = users.map((user) => {
    return {
      _id: user._id,
      email: user.email,
    };
  });

  return newUsers;
};

const getYearlyUserStats = async (year: number) => {
  const users = await User.aggregate([
    {
      $project: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      },
    },
    { $match: { year } },
    {
      $group: {
        _id: '$month',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result: { month: number; users: number }[] = [];

  for (let m = 1; m <= 12; m++) {
    const found = users.find((a) => a._id === m);
    result.push({
      month: m,
      users: found?.count || 0,
    });
  }

  return result;
};

export default {
  fetchDasboardPageData,
  getYearlyUserStats,
  getRecentUsers,
};

// const getYearlyAdminEarnings = async (year: number) => {

//   const earnings = await Booking.aggregate([
//     {
//       $project: {
//         year: { $year: '$paymentDetails.paidAt' },
//         month: { $month: '$paymentDetails.paidAt' },
//         adminEarning: '$paymentDetails.amount',
//       },
//     },
//     { $match: { year } },
//     {
//       $group: {
//         _id: '$month',
//         totalEarning: { $sum: '$adminEarning' },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);

//   // Fill months with 0 if no data
//   const result: { month: number; earning: number }[] = [];
//   for (let m = 1; m <= 12; m++) {
//     const found = earnings.find((a) => a._id === m);
//     result.push({
//       month: m,
//       earning: found?.totalEarning || 0,
//     });
//   }

//   return result;
// };

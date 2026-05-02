const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'ไม่พบข้อมูลที่ระบุ';
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = 'ข้อมูลซ้ำ - มีอยู่ในระบบแล้ว';
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;

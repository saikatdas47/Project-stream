

class ApiResponse {
  constructor(statusCode, message="success", data) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success=statusCode >= 200 && statusCode < 300;
  }

  send(res) {
    res.status(this.statusCode).json({
      status: this.statusCode,
      message: this.message,
      data: this.data,
    });
  }
}

export {
    ApiResponse
}
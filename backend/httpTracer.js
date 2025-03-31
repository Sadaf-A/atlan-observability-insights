const axios = require("axios");
const Trace = require("./models/Trace");
const { v4: uuidv4 } = require("uuid");

async function traceRequest(method, url, data = null) {
  const traceId = uuidv4();
  const spanId = uuidv4();
  const startTime = new Date();
  try {
    const response = await axios({
      method,
      url,
      data,
    });

    console.log(response);
    
    const newTrace = new Trace({
      traceId,
      createdAt: startTime,
      spans: [
        {
          spanId,
          parentSpanId: null,
          serviceName: "monitored-url",
          operationName: `${method.toUpperCase()} ${url}`,
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          tags: { statusCode: response.status },
          logs: [],
        },
      ],
    });

    await newTrace.save();
    return response.data;
  } catch (error) {
    const errorTrace = new Trace({
      traceId,
      createdAt: startTime,
      spans: [
        {
          spanId,
          parentSpanId: null,
          serviceName: "monitored-url",
          operationName: `${method.toUpperCase()} ${url}`,
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          tags: {
            statusCode: error.response?.status || 500,
            error: error.message,
          },
          logs: [],
        },
      ],
    });

    await errorTrace.save();
    throw error;
  }
}

module.exports = traceRequest;

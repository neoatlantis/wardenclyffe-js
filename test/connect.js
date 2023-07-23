const { Wardenclyffe } = require("../dist/wardenclyffe.dev.js");

const wardenclyffe = new Wardenclyffe({
    url: "mqtt://test.mosquitto.org:1883"
});

wardenclyffe.connect();

wardenclyffe.rpc.register("echo", (e)=>{
    return e;
});
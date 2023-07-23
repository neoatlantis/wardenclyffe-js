const { Wardenclyffe } = require("../dist/wardenclyffe.dev.js");

const wardenclyffe = new Wardenclyffe({
    namespace: "rpcserver",
    url: "mqtt://test.mosquitto.org:1883"
});


wardenclyffe.rpc.register("add", (e)=>{
    return e.a+e.b;
});


async function main(){
    await wardenclyffe.connect();
}
main();
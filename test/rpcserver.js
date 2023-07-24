const config = require("./config-rpcserver.js");
const { Wardenclyffe } = require("../dist/wardenclyffe.dev.js");


const wardenclyffe = new Wardenclyffe(config.mqtt);


wardenclyffe.rpc.register("add", (e)=>{
    return e.a+e.b;
});


async function main(){
    await wardenclyffe.connect();
}
main();
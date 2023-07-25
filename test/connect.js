const config = require("./config-rpcclient.js");
const { Wardenclyffe } = require("../dist/wardenclyffe.dev.js");


const options = config.mqtt;
options.onWatchdogTimeout = function(){
    console.log("---------------------------- WATCHDOG TIMED OUT! -----");
}
options.emitHeartbeat = true;

const wardenclyffe = new Wardenclyffe(options);

async function main(){
    await wardenclyffe.connect();


    while(true){
        try{
            console.log("- Sending request...");
            let ret = await wardenclyffe.rpc.call(
                "rpcserver", "add", { a: 1, b: 2 }
            );
            console.log("- Response got with:");
            console.log("....ok", ret);
        } catch(e){
            console.log("....err", e);
        }
    
        await new Promise((resolve)=>setTimeout(resolve, 2000));
    }

}
main();
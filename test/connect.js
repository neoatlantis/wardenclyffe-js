const config = require("./config-rpcclient.js");
const { Wardenclyffe } = require("../dist/wardenclyffe.dev.js");


const wardenclyffe = new Wardenclyffe(config.mqtt);



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
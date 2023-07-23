const { Wardenclyffe } = require("../dist/wardenclyffe.dev.js");

const wardenclyffe = new Wardenclyffe({
    url: "mqtt://test.mosquitto.org:1883"
});


wardenclyffe.rpc.register("add", (e)=>{
    return e.a+e.b;
});


async function main(){
    await wardenclyffe.connect();


    setInterval(async ()=>{
        try{
            let ret = await wardenclyffe.rpc.call(
                "testclient", "test", { hello: 'world'},
                { timeout: 30000 }
            );
            console.log(ret);
        } catch(e){
            console.log(e);
        }
    }, 5000);
}
main();
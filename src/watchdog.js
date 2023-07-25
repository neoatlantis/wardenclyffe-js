import events from "events";
import _ from "lodash";


class Watchdog extends events.EventEmitter{

    #client;
    #started;
    constructor(options){
        super();

        const timeout = _.get(options, "timeout", 30000);

        setInterval(()=>{
            const now = new Date().getTime();
            if(
                this.#started &&
                now - this.#last_heartbeat >= timeout
            ){
                this.emit("bark");
            }
        }, 1000);

        if(_.get(options, "emission")){
            setInterval(()=>{
                try{
                    if(!this.#client.connected) return;
                    this.#client.publish(
                        "/wardenclyffe/heartbeat",
                        new Date().toISOString(),
                        { qos: 0 }
                    );
                } catch(e){
                    console.error(e);
                }
            }, 5000);
        }
    }

    bindEventsToClient(client){
        this.#client = client;

        this.#client.subscribe("/wardenclyffe/heartbeat");

        this.#client.on("connect", ()=>{
            this.#started = true;
            this.#record_heartbeat();
        });

        this.#client.on("message", ()=>{
            this.#record_heartbeat();
        });
    }

    #last_heartbeat = 0;
    #record_heartbeat(){
        this.#last_heartbeat = new Date().getTime();
    }




}



export default Watchdog;
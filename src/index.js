import _ from "lodash";
import mqtt from "mqtt";
import path from "path";


const symbolEventsBound = Symbol();



class Wardenclyffe {

    #client;
    
    #mqtt_url;
    #channel_prefixes;

    constructor(options){
        const namespace = _.get(options, "namespace", "default");
        if(!_.isString(namespace || !/^[a-z]+$/.test(namespace))){
            throw Error("Invalid namespace.");
        }

        this.#channel_prefixes = {
            /* req: Incoming requests from other instances to us. */
            "req": "req/" + namespace + "/",

            /* res: Outgoing responses from this instance. */
            "res": "res/" + namespace + "/",

            /* pub: Incoming deliveries of events from other instances. */
            "pub": "pub/" + namespace + "/",

            /* sub: Outgoing events from this instance. */
            "sub": "sub/" + namespace + "/",
        };

        this.#mqtt_url = _.get(options, "url");
    }

    connect(){
        this.#client = mqtt.connect(this.#mqtt_url);

        this.#client.on("connect", ()=>{
            console.log("MQTT connnected.");
            this.#bindEvents(this.#client);
        });
    }

    #topicBuilder(type, topic){
        if(this.#channel_prefixes[type] === undefined){
            throw Error("Invalid type.");
        }
        topic = topic.replace(/\./g, "/");
        return path.posix.join(this.#channel_prefixes[type], topic);
    }

    #bindEvents(client){
        // for a given instance of client, don't bind events repeatly
        if(_.get(client, symbolEventsBound) === true) return;

        client.subscribe(this.#topicBuilder('req', '#'), { qos: 2 });
        client.subscribe(this.#topicBuilder('pub', '#'), { qos: 2 });

        client.on("message", console.log);
        client[symbolEventsBound] = true;
    }

    #onMessage(topic, messageBuffer, packet){
        
    }

}


export { Wardenclyffe };
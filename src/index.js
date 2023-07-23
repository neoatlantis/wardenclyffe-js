import _ from "lodash";
import mqtt from "mqtt";
import path from "path";

import WardenclyffeRPCDispatch from "./rpc";
import WardenclyffeEventingDispatch from "./eventing";


const symbolEventsBound = Symbol();



class Wardenclyffe {

    #client;
    #mqtt_url;

    #eventing;
    #rpc;

    constructor(options){
        const namespace = _.get(options, "namespace", "default");
        if(!_.isString(namespace || !/^[a-z]+$/.test(namespace))){
            throw Error("Invalid namespace.");
        }

        this.#mqtt_url = _.get(options, "url");


        this.#rpc = new WardenclyffeRPCDispatch({
            namespace,
        });

        this.#eventing = new WardenclyffeEventingDispatch({
            namespace,
        });
    }

    connect(){
        this.#client = mqtt.connect(this.#mqtt_url, {
            protocolVersion: 5,
        });

        this.#client.on("connect", ()=>{
            console.log("MQTT connnected.");
            this.#bindEvents(this.#client);
        });
    }

    #bindEvents(client){
        // for a given instance of client, don't bind events repeatly
        if(_.get(client, symbolEventsBound) === true) return;

        this.#rpc.bindEventsToClient(client);
        this.#eventing.bindEventsToClient(client);

        client.on("message", (a,b,c)=>this.#onMessage(a,b,c));
        client[symbolEventsBound] = true;
    }

    #onMessage(topic, messageBuffer, packet){
        if(false === this.#rpc.onMessage(topic, messageBuffer, packet)){
            this.#eventing.onMessage(topic, messageBuffer, packet);
        }
    }

    get rpc(){ return this.#rpc }
    get eventing(){ return this.#eventing }

}


export { Wardenclyffe };
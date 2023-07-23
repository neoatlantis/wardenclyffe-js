import _ from "lodash";
import events from "events";
import mqtt from "mqtt";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import WardenclyffeRPCDispatch from "./rpc";
import WardenclyffeEventingDispatch from "./eventing";


const symbolEventsBound = Symbol();



class Wardenclyffe extends events.EventEmitter {

    #clientId;
    #client;
    #mqtt_url;

    #eventing;
    #rpc;

    constructor(options){
        super();

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

        this.#clientId = "Wardenclyffe-" + uuidv4();
    }

    connect(){
        this.#client = mqtt.connect(this.#mqtt_url, {
            protocolVersion: 5,
            keepalive: 5,
            clean: false, // set to false to receive QoS 1&2 while offline
            clientId: this.#clientId,
        });

        this.#client.on("reconnect", ()=>{
            console.log("Reconnecting...");
        });

        this.#client.on("offline", ()=>{
            console.log("Client offline.");
        });

        return new Promise((resolve, _)=>{
            this.#client.on("connect", ()=>{
                console.log("MQTT connnected.");
                this.emit("connect");
                this.#bindEvents(this.#client);
                resolve();
            });
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
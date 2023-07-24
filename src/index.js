import WebSocket from "ws";

import _ from "lodash";
import events from "events";
import mqtt from "mqtt";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

import WardenclyffeRPCDispatch from "./rpc";
import WardenclyffeEventingDispatch from "./eventing";


const symbolEventsBound = Symbol();

global.WebSocket = WebSocket;



class Wardenclyffe extends events.EventEmitter {

    #clientId;
    #client;
    #mqtt_url; #mqtt_username; #mqtt_password;

    #eventing;
    #rpc;

    constructor(options){
        super();

        const namespace = _.get(options, "namespace", "default");
        if(!_.isString(namespace || !/^[a-z]+$/.test(namespace))){
            throw Error("Invalid namespace.");
        }

        this.#mqtt_url      = _.get(options, "url");
        this.#mqtt_username = _.get(options, "username");
        this.#mqtt_password = _.get(options, "password");

        if(_.isNil(this.#mqtt_url)) throw Error("url cannot be empty.");
        

        this.#rpc = new WardenclyffeRPCDispatch({
            namespace,
        });

        this.#eventing = new WardenclyffeEventingDispatch({
            namespace,
        });

        this.#clientId = "Wardenclyffe-" + uuidv4();
    }

    connect(){
        console.log("Connecting: " + this.#mqtt_url);

        this.#client = mqtt.connect(this.#mqtt_url, {
            username: _.isString(this.#mqtt_username) ? this.#mqtt_username : undefined,
            password: this.#mqtt_password ? Buffer.from(this.#mqtt_password, "ascii") : undefined,
            protocolVersion: 5,
            keepalive: 5,
            clean: false, // set to false to receive QoS 1&2 while offline
            clientId: this.#clientId,
        });        

        return new Promise((resolve, reject)=>{
            this.#client.once("error", (err)=>{
                reject(err);
            });

            this.#client.once("connect", ()=>{
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

        client.on("reconnect", ()=>{
            console.log("Reconnecting...");
        });

        client.on("offline", ()=>{
            console.log("Client offline.");
        });

        client.on("error", (err)=>{
            console.error(err);
        });

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
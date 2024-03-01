import _ from "lodash";
import path from "path";
import events from "events"
import { pack, unpack } from "msgpackr";
import EventingChannel from "./EventingChannel";
const debug = require("debug")("wardenclyffe:eventing");


const GENERAL_EVENTING_PREFIX = "/wardenclyffe/events/";

class WardenclyffeEventingDispatch extends events.EventEmitter {

    #channel_prefix;
    #client;
    #channels;

    constructor(options){
        super();

        this.#channel_prefix = GENERAL_EVENTING_PREFIX;
        this.#channels = new Set();
    }


    bindEventsToClient(client){
        if(!_.isNil(this.#client)) return;
        this.#client = client;
    }

    __onMessage(topic, messageBuffer, messagePacket){
        if(!_.startsWith(topic, this.#channel_prefix)) return false;
        const relativeTopic = path.posix.relative(this.#channel_prefix, topic);
        try{
            let payload = unpack(messageBuffer);
            debug("Received event:", relativeTopic, ", payload:", payload);
            this.emit(relativeTopic, payload);
        } catch(e){
            debug("Received unparsable event, skip.");
        }
    }

    __sendMessage(namespace, topic, payload, options){
        if(!this.#client || !this.#client.connected){
            // necessary, as otherwise unnecessary calls on MQTT will result
            // in burden and hinders reconnection schedule.
            throw Error("offline");
        }

        topic = _.trim(topic, "/.").replace(/\./g, "/");

        const targetTopic = path.posix.join(
            GENERAL_EVENTING_PREFIX,
            namespace,
            topic
        );

        const qos = _.get(options, "qos", 0);

        return this.#client.publish(targetTopic, pack(payload), {
            qos,
        });
    }
    

    join(channel_name){
        if(!this.#channels.has(channel_name)){
            this.#channels.add(channel_name);
            this.#client.subscribe(
                path.posix.join(this.#channel_prefix, channel_name, "#"),
                { qos: 1 }
            );
        }
        return new EventingChannel(this, channel_name);
    }

    leave(channel_name){
        this.#channels.delete(channel_name);
        return this.#client.unsubscribe(
            path.posix.join(this.#channel_prefix, channel_name, "#"),
            { qos: 1 }
        );
    }

    
}

export default WardenclyffeEventingDispatch;
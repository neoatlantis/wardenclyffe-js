import _ from "lodash";
import path from "path";
import events from "events"
import { pack, unpack } from "msgpackr";
const debug = require("debug")("wardenclyffe:eventing");


const GENERAL_EVENTING_PREFIX = "/wardenclyffe/events/";

class WardenclyffeEventingDispatch extends events.EventEmitter {

    #channel_prefix;
    #client;

    constructor(options){
        super();

        const namespace = _.get(options, "namespace");

        this.#channel_prefix = GENERAL_EVENTING_PREFIX + namespace + "/";
    }

    bindEventsToClient(client){
        this.#client = client;
        client.subscribe(
            path.posix.join(this.#channel_prefix, "#"),
            { qos: 1 }
        );
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

    send(namespace, topic, payload, options){
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
}

export default WardenclyffeEventingDispatch;
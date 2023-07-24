import _ from "lodash";
import path from "path";
import events from "events"


class WardenclyffeEventingDispatch extends events.EventEmitter {

    #channel_prefix_outgoing;
    #channel_prefix_incoming;

    constructor(options){
        super();

        const namespace = _.get(options, "namespace");

        this.#channel_prefix_outgoing = "/wardenclyffe/sub/" + namespace + "/";
        this.#channel_prefix_incoming = "/wardenclyffe/pub/" + namespace + "/";
    }

    bindEventsToClient(client){
        client.subscribe(
            path.posix.join(this.#channel_prefix_incoming, "#"),
            { qos: 1 }
        );
    }

    __onMessage(topic, messageBuffer, messagePacket){
        if(!_.startsWith(topic, this.#channel_prefix_incoming)) return false;

    }

}

export default WardenclyffeEventingDispatch;
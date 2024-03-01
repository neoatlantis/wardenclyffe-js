class WardenclyffeEventingChannel extends events.EventEmitter {

	#channel_name;
	#dispatcher;

	constructor(dispatcher, channel_name){
		super();
		this.#channel_name = channel_name;
		this.#dispatcher = dispatcher;

		this.#dispatcher.on(
			"message",
			(namespace, topic, payload)=>this.#onMessage(topic, payload)
		);
	}

	publish(topic, payload, options){
		this.#dispatcher.__sendMessage(
			this.#channel_name, topic, payload, options);
	}

	#onMessage(namespace, topic, payload){
		if(namespace != this.#channel_name) return; // filter
		// emit
	}

}

export default WardenclyffeEventingChannel;
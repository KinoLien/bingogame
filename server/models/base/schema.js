"use strict";

var Schema = {

  uniqueusers:{
    id:{type: "increments",  primary: true},
    email: {type: "string", maxlength: 255, unique: true, index: true},
    created_at: {type: "dateTime", defaultTo: 'now' },
    updated_at: {type: "dateTime", defaultTo: 'now' },
  },
  domains: {
    id: {type: "increments",  primary: true},
    host: {type: "string", maxlength: 255, unique: true, index: true},
    is_send_email: {type: "boolean" , defaultTo: false},
    title: {type: "string", maxlength: 255, defaultTo: ''},
    created_at: {type: "dateTime", defaultTo: 'now' },
    updated_at: {type: "dateTime", defaultTo: 'now' },
  },
  domainusers: {
    id: {type: "increments",  primary: true},
    uid: {type: "string", maxlength: 255, index: true},
    domain_id: {type: "integer", unsigned: true, index: true},
    uniqueusers_id: {type: "integer", nullable: true, unsigned: true, index: true},
    is_login: {type: "boolean" , defaultTo: false},
    role: {type: "string", maxlength: 255, defaultTo: ''},
    name: {type: "string", maxlength: 255},
    image: {type: "text", nullable: true},
    description: {type: "text", nullable: true},
    created_at: {type: "dateTime", defaultTo: 'now'},
    updated_at: {type: "dateTime", defaultTo: 'now' },
  },
  rooms: {
    id: {type: "increments",  primary: true},
    domain_id: {type: "integer",  unsigned: true, index: true},
    last_message_id: {type: "integer", nullable: true,  unsigned: true, index: true},
    created_at: {type: "dateTime", defaultTo: 'now' },
    updated_at: {type: "dateTime", defaultTo: 'now' },  // changed by each message
  },
  messages:{
    id: {type: "increments",  primary: true},
    room_id: {type: "integer",  unsigned: true, index: true},
    domainuser_id: {type: "integer", unsigned: true, index: true},
    content: {type: "text"},
    metatype: {type: "string", maxlength: 255},
    created_at: {type: "dateTime", defaultTo: 'now' },
    updated_at: {type: "dateTime", defaultTo: 'now' },
  },
  participants: {
    id: {type: "increments",  primary: true},
    room_id: {type: "integer", unsigned: true, index: true},
    domainuser_id: {type: "integer", unsigned: true, index: true},
    last_message_id: {type: "integer", nullable: true,  unsigned: true, index: true}, // has read meessage_id
    unread_messages_count: {type: "integer", defaultTo: 0 },
    created_at: {type: "dateTime", defaultTo: 'now' },
    updated_at: {type: "dateTime", defaultTo: 'now' },
  },
  session: {
    sid: {type: "string",  primary: true},
    sess: {type: "json", nullable: false},
    expire: {type: "dateTime", nullable: false}
  }

};

module.exports = Schema;

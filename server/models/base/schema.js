"use strict";

var Schema = {

  questions: {
    id: {type: "increments",  primary: true},
    title: {type: "string", maxlength: 255, defaultTo: ''},
    content: {type: "string", defaultTo: '' },
    explain: {type: "string", defaultTo: '' }
  },

  options: {
    id: {type: "increments",  primary: true},
    q_id: {type: "integer", unsigned: true, index: true},
    content: {type: "string", defaultTo: '' },
    is_answer: {type: "boolean" , defaultTo: false}
  },

  // scores: {
  //   id: {type: "increments",  primary: true},
  //   blocks: {type: "integer", unsigned: true, defaultTo: 0},
  //   lines: {type: "integer", unsigned: true, defaultTo: 0},
  //   created_at: {type: "dateTime", defaultTo: 'now' },
  //   updated_at: {type: "dateTime", defaultTo: 'now' }
  // },

  gifts: {
    id: {type: "increments",  primary: true},
    type: {type: "string", maxlength: 255},
    quantity: {type: "integer", unsigned: true, defaultTo: 0},
    earn_condition: {type: "integer", unsigned: true, defaultTo: 0 }
  },

  players: {
    id: {type: "increments",  primary: true},
    unique_id: {type: "string", maxlength: 255, index: true},
    g_id: {type: "integer", unsigned: true, index: true},
    lines: {type: "integer", unsigned: true, defaultTo: 0},
    from: {type: "string", maxlength: 255},
    name: {type: "string", maxlength: 255, defaultTo: '' },
    address: {type: "string", defaultTo: '' },
    status: {type: "string", maxlength: 255, defaultTo: ''},  // end, playing, locked
    created_at: {type: "dateTime", defaultTo: 'now' },
    updated_at: {type: "dateTime", defaultTo: 'now' }
  },

  answerlogs: {
    id: {type: "increments",  primary: true},
    p_id: {type: "integer", unsigned: true, index: true},
    q_id: {type: "integer", unsigned: true, index: true},
    correct: {type: "boolean" , defaultTo: false},
    block_position: {type: "string", maxlength: 64},
    created_at: {type: "dateTime", defaultTo: 'now' }
  }
// question Q (id, text, explain) 
// option O (id, Q_id, text, is_answer)
// score S (id, scores, lines, final_blocks) Date
// final_blocks: [[1,0,0,0,1],[1,1,0,0,1]...]
// gift G (id, type, quantity, locked_quantity, earn_condition) Date
// player P (id, unique_id, S_id, G_id, from, name, address, status) Date
// status: ‘locked’, ‘fail’, ‘winner’, ‘'
// log L (id, P_id, Q_id, correct, blok_position) Date
  // session: {
  //   sid: {type: "string",  primary: true},
  //   sess: {type: "json", nullable: false},
  //   expire: {type: "dateTime", nullable: false}
  // }
};

module.exports = Schema;


var Bookshelf = require('./base');

var Option = Bookshelf.Model.extend({
  tableName: "options",
  
  question: function(){
    return this.belongsTo('Question', "q_id");
  }

  // domain: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Domain', "domain_id");
  // },
  // uniqueuser: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Uniqueuser', "uniqueuser_id");
  // },
});

var Options = Bookshelf.Collection.extend({
  model: Option
});

module.exports = {
  Option: Bookshelf.model('Option', Option),
  Options: Bookshelf.collection('Options', Options)
}

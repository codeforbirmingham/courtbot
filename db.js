var Knex = require('knex');
var knex = Knex.initialize({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

exports.findCitation = function(citation, callback) {
  // Postgres JSON search based on prebuilt index
  citation = escapeSQL(citation.toUpperCase());
  var citationSearch = knex.raw("'{\"" + citation + "\"}'::text[] <@ (json_val_arr(citations, 'id'))");
  knex('cases').where(citationSearch).select().exec(callback);
};

exports.fuzzySearch = function(str, callback) {
  var parts = str.toUpperCase().split(" ");

  // Search for Names
  var query = knex('cases').where('defendant', 'like', '%' + parts[0] + '%');
  if (parts.length > 1) query = query.andWhere('defendant', 'like', '%' + parts[1] + '%');

  // Search for Citations
  var citation = escapeSQL(parts[0]);
  var citationSearch = knex.raw("'{\"" + citation + "\"}'::text[] <@ (json_val_arr(citations, 'id'))");
  query = query.orWhere(citationSearch);

  // Limit to ten results
  query = query.limit(10);
  query.exec(callback);
};

exports.addReminder = function(caseId, phone, callback) {
  knex('reminders').insert({
    case_id: caseId,
    sent: false,
    phone: phone,
    created_at: new Date(),
  }).exec(callback);
};

var escapeSQL = function(val) {
  val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
    switch(s) {
      case "\0": return "\\0";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\b": return "\\b";
      case "\t": return "\\t";
      case "\x1a": return "\\Z";
      default: return "\\"+s;
    }
  });
  return val;
};
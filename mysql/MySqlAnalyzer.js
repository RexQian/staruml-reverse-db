const Request = require("../db/DbRequest");
const DbAnalyzer = require("../db/DbAnalyzer");
const Manager = require("./MySqlManager");

class MySqlAnalyzer extends DbAnalyzer {
  /**
   * MySqlAnalyzer
   *
   * @constructor
   */
  constructor(options, model) {
    super(options, model, new Manager(options));
  }

  analyze() {
    const self = this;
    const sqlStr = "SELECT "
        + "  col.TABLE_CATALOG            AS table_catalog, "
        + "  col.TABLE_SCHEMA             AS owner, "
        + "  col.TABLE_NAME               AS table_name, "
        + "  col.COLUMN_NAME              AS column_name, "
        + "  col.ORDINAL_POSITION         AS ordinal_position, "
        + "  col.COLUMN_DEFAULT           AS default_setting, "
        + "  col.DATA_TYPE                AS data_type, "
        + "  col.CHARACTER_MAXIMUM_LENGTH AS max_length, "
        + "  col.DATETIME_PRECISION       AS date_precision, "
        + "  CAST(CASE col.IS_NULLABLE "
        + "       WHEN 'NO' "
        + "         THEN 0 "
        + "       ELSE 1 END AS unsigned) AS is_nullable, "
        + "  CAST(CASE ks.CONSTRAINT_TYPE "
        + "       WHEN 'PRIMARY KEY' "
        + "         THEN 1 "
        + "       ELSE 0 END AS unsigned) AS is_primary_key, "
        + "  CAST(CASE ks.CONSTRAINT_TYPE "
        + "       WHEN 'UNIQUE' "
        + "         THEN 1 "
        + "       ELSE 0 END AS unsigned) AS is_unique, "
        + "  CAST(CASE fk.CONSTRAINT_TYPE "
        + "       WHEN 'FOREIGN KEY' "
        + "         THEN 1 "
        + "       ELSE 0 END AS unsigned) AS is_foreign_key, "
        + "  fk.CONSTRAINT_NAME           AS foreign_key_name, "
        + "  fk.REFERENCED_TABLE_NAME     AS referenced_table_name, "
        + "  fk.REFERENCED_COLUMN_NAME    AS referenced_column_name "
        + "FROM INFORMATION_SCHEMA.COLUMNS AS col "
        + "  LEFT JOIN (SELECT "
        + "               k.TABLE_SCHEMA    AS TABLE_SCHEMA, "
        + "               k.TABLE_NAME      AS TABLE_NAME, "
        + "               k.COLUMN_NAME     AS COLUMN_NAME, "
        + "               t.CONSTRAINT_TYPE AS CONSTRAINT_TYPE, "
        + "               t.CONSTRAINT_NAME AS CONSTRAINT_NAME "
        + "             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS t "
        + "               JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS k "
        + "               USING (CONSTRAINT_NAME, TABLE_SCHEMA, TABLE_NAME) "
        + "             WHERE k.POSITION_IN_UNIQUE_CONSTRAINT IS NULL) AS ks "
        + "  USING (TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME) "
        + "  LEFT JOIN (SELECT "
        + "               k.TABLE_SCHEMA           AS TABLE_SCHEMA, "
        + "               k.TABLE_NAME             AS TABLE_NAME, "
        + "               k.COLUMN_NAME            AS COLUMN_NAME, "
        + "               t.CONSTRAINT_TYPE        AS CONSTRAINT_TYPE, "
        + "               t.CONSTRAINT_NAME        AS CONSTRAINT_NAME, "
        + "               k.REFERENCED_TABLE_NAME  AS REFERENCED_TABLE_NAME, "
        + "               k.REFERENCED_COLUMN_NAME AS REFERENCED_COLUMN_NAME "
        + "             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS k "
        + "               JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS t "
        + "               USING (CONSTRAINT_NAME, TABLE_SCHEMA, TABLE_NAME) "
        + "             WHERE k.POSITION_IN_UNIQUE_CONSTRAINT IS NOT NULL) AS fk "
        + "  USING (TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME) "
        + "WHERE col.TABLE_SCHEMA = ? AND col.TABLE_CATALOG = ? "
        + "ORDER BY col.TABLE_NAME, col.ORDINAL_POSITION;";

    const request = new Request(sqlStr, [self.options.owner || self.options.userName, self.options.options.database]);

    return this.executeSql(request).then(([rows, fields]) => {
      const builder = app.repository.getOperationBuilder();
      builder.begin("Generate ER Data Model");

      rows.forEach(row => self.performFirstPhase(row, columnProperty => columnProperty));
      self.performSecondPhase();

      builder.end();
      app.repository.doOperation(builder.getOperation());
    })
  };
}

module.exports = MySqlAnalyzer;
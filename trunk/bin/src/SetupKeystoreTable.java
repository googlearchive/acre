// Copyright 2007-2010 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.DatabaseMetaData;

public class SetupKeystoreTable {
    public static final String ACRE_VERSION_TABLE = "acre_schema_version";

    public static int get_version(Connection conn) throws SQLException {
        DatabaseMetaData md = conn.getMetaData();
        ResultSet rs = md.getTables(null, null, ACRE_VERSION_TABLE, null);
        if  (!rs.next()) {
            return -1;
        }
        String q = "SELECT version FROM "+ACRE_VERSION_TABLE+
            " ORDER BY timestamp DESC";
        Statement stat = conn.createStatement();
        ResultSet ver_rs = stat.executeQuery(q);
        if (!ver_rs.first()) {
            return -1;
        } else {
            return ver_rs.getInt("version");
        }
    }

    public static void create_schema_version(Connection conn) throws SQLException {
        Statement stat = conn.createStatement();
        stat.executeUpdate(
          "CREATE TABLE "+ACRE_VERSION_TABLE+" (" +
          "version INTEGER NOT NULL, " +
          "timestamp LONG NOT NULL );"
        );
    }

    public static void create_schema_0(Connection conn) throws SQLException {
        Statement stat = conn.createStatement();
        stat.executeUpdate(
          "CREATE TABLE acre_keystore (" +
          "key_id VARCHAR(128) NOT NULL, " +
          "app_id VARCHAR (1024) NOT NULL, " +
          "token VARCHAR (2048) NOT NULL, " +
          "secret VARCHAR(2048), " +
          "dbid INTEGER NOT NULL DEFAULT 0, " +
          "deleted BOOLEAN NOT NULL DEFAULT FALSE, " +
          "timestamp LONG NOT NULL  );"
        );
        update_version(conn, 0);
    }

    public static void upgrade_schema_0_to_1(Connection conn) throws SQLException {
        Statement stat = conn.createStatement();

        stat.executeUpdate(
                           "CREATE TABLE acre_keystore_new (" +
                           "  key_id VARCHAR(128), " +
                           "  app_id VARCHAR(128), " +
                           "  token VARCHAR(2048) NOT NULL, " +
                           "  secret VARCHAR(2048), "+
                           "  PRIMARY KEY (key_id, app_id));"
                           );

        stat.executeUpdate("INSERT INTO acre_keystore_new " +
                           "  (key_id, app_id, token, secret) " +
                           "  SELECT key_id, app_id, token, secret " +
                           "    FROM acre_keystore AS ak1 WHERE " +
                           "    deleted = 0 AND timestamp = (SELECT "+
                           "    MAX(ak2.timestamp) FROM acre_keystore "+
                           "    AS ak2 WHERE ak1.key_id = ak2.key_id AND"+
                           "    ak1.app_id = ak2.app_id) ORDER BY timestamp;"
                           );
        
        stat.executeUpdate("DROP TABLE acre_keystore;");
        stat.executeUpdate("ALTER TABLE acre_keystore_new RENAME TO acre_keystore;");

        update_version(conn, 1);
    }

    public static void update_version(Connection conn, int ver)
      throws SQLException {
        String q = "INSERT INTO "+ACRE_VERSION_TABLE+" VALUES (?, ?);";
        PreparedStatement pstat = conn.prepareStatement(q);
        pstat.setInt(1, ver);
        pstat.setLong(2, new java.util.Date().getTime());
        pstat.executeUpdate();
    }

    public static int _sanity_check_version_arg(String version) {
        int ver;
        try {
            ver = Integer.parseInt(version);
        } catch (NumberFormatException e) {
            System.err.println("Invalid version specified on command line");
            System.exit(1);
            return -1;
        }

        if (ver > 1) {
            System.err.println("Version "+ver+" from the future, cannot create");
            System.exit(1);
        }
        return ver;
    }

    public static void create_table(Connection conn, String version) 
      throws SQLException {
        int ver = _sanity_check_version_arg(version);

        int dbver = get_version(conn);

        if (dbver == ver) {
            System.exit(0);
        }

        if (dbver == -1) {
            create_schema_version(conn);
        }

        int curver = dbver;
        while (curver < ver) {
            switch (curver) {
            case -1:
                create_schema_0(conn);
                break;
            case 0:
                upgrade_schema_0_to_1(conn);
                break;
            default:
                System.err.println("Can't update schema version from "+
                                   curver+ " to "+dbver);
                System.exit(1);
            }
            curver++;
        }
    }

    public static void check_table(Connection conn, String version)
      throws SQLException {
        int ver = _sanity_check_version_arg(version);
        int dbver = get_version(conn);

        if (dbver == ver) {
            System.exit(0);
        } else {
            System.err.println("Version "+ver+" does not match version "+dbver+
                               " in database");
            System.exit(1);
        }
    }

    public static void main(String[] args) throws ClassNotFoundException, SQLException {
        // args[0] = ACTION
        // args[1] = ACRE_SQL, args[2] = ACRE_SQL_USER,
        // args[3] = ACRE_SQL_PASSWORD, args[4] == ACRE_SQL_TABLE
        // args[5] = ACRE_SQL_TABLE_VERSION
        Class.forName("com.mysql.jdbc.Driver");
        Connection conn;
        try {
            conn = DriverManager.getConnection(args[1], args[2], args[3]);
            if (args[0].equals("check")) {
                check_table(conn, args[5]);
            } else if (args[0].equals("create")) {
                create_table(conn, args[5]);
            } else {
                System.err.println("Cannot handle command "+args[0]);
                System.exit(1);
            }
        } catch (SQLException e) {
            System.err.println("An SQLException occured, this could mean a bug"+
                               " in the SetupKeystoreTable code or an issue with"+
                               " the SQL server");
            e.printStackTrace();
            System.exit(1);
        }
    }
}

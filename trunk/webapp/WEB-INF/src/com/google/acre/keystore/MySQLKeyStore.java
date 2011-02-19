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

package com.google.acre.keystore;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.dbcp.ConnectionFactory;
import org.apache.commons.dbcp.DriverManagerConnectionFactory;
import org.apache.commons.dbcp.PoolableConnectionFactory;
import org.apache.commons.dbcp.PoolingDriver;
import org.apache.commons.pool.impl.GenericObjectPool;

import com.google.acre.Configuration;
import com.google.acre.logging.MetawebLogger;

public class MySQLKeyStore implements KeyStore {

    private static MetawebLogger _logger = new MetawebLogger();
	
    private static final String DRIVER_PREFIX = "jdbc:apache:commons:dbcp:";
    private static final String DATASOURCE_NAME = "keystore";
    private static final String DATASOURCE = DRIVER_PREFIX + DATASOURCE_NAME;
    private static final String TEST_QUERY = "select 1";
    private static final String ERROR_MSG = "MySQL Driver not found at startup, can't connect to keystore.";
    
    private static MySQLKeyStore _singleton;
    
    public static synchronized MySQLKeyStore getKeyStore() {
        if (_singleton == null) {
            _singleton = new MySQLKeyStore();
        }
        return _singleton;
    }

    // ---------------------------------------------------------------------------
    
    private boolean active = false;
    
    private String _table_name;

    private MySQLKeyStore() {
        try {
            Class.forName(Configuration.Values.ACRE_SQL_DRIVER.getValue());
        } catch (ClassNotFoundException e) {
            _logger.warn("acre.keystore", "MySQL JDBC Driver not found");
            return;
        }

        try {
            setupDriver(
                        Configuration.Values.ACRE_SQL.getValue(), 
                        Configuration.Values.ACRE_SQL_USER.getValue(), 
                        Configuration.Values.ACRE_SQL_PASSWORD.getValue()
                        );
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
                
        _table_name = Configuration.Values.ACRE_SQL_TABLE.getValue();
    }

    private void setupDriver(String connectURI, String username, String password)
        throws SQLException, ClassNotFoundException {

        GenericObjectPool connectionPool = new GenericObjectPool(null);
        connectionPool.setTimeBetweenEvictionRunsMillis(5 * 60 * 1000 - 13); // check if jdbc connections are still alive every 5 min - 13 msec

        ConnectionFactory connectionFactory = new DriverManagerConnectionFactory(connectURI,username,password);

        new PoolableConnectionFactory(connectionFactory,connectionPool,null,TEST_QUERY,false,true);

        Class.forName("org.apache.commons.dbcp.PoolingDriver");
        PoolingDriver driver = (PoolingDriver) DriverManager.getDriver(DRIVER_PREFIX);

        driver.registerPool(DATASOURCE_NAME,connectionPool);

        active = true;
        
        // Now we can just use the connect string "jdbc:apache:commons:dbcp:keystore"
        // to access our pool of Connections.
    }
    
    public void put_key(String keyname, String appid, String token, String secret) {
        insert_key(keyname, appid, token, secret);
    }

    public void put_key(String keyname, String appid, String token) {
        insert_key(keyname, appid, token, null);
    }

    public void delete_key(String keyname, String appid) {
    	if (!active) throw new RuntimeException(ERROR_MSG);
    	
        String q = "DELETE FROM " + _table_name +
            " WHERE key_id = ? AND app_id = ?;";

        Connection conn = null;
        PreparedStatement stat = null;

        try {
            conn = DriverManager.getConnection(DATASOURCE);

            stat = conn.prepareStatement(q);
            stat.setString(1, keyname);
            stat.setString(2, appid);

            stat.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        } finally {
            try { stat.close(); } catch(Exception e) { }
            try { conn.close(); } catch(Exception e) { }
        }
    }

    public String[] get_key(String keyname, String appid) {
    	if (!active) throw new RuntimeException(ERROR_MSG);

        String q = "SELECT token, secret FROM " + _table_name +
            " WHERE key_id = ? AND app_id = ?;";

        Connection conn = null;
        PreparedStatement stat = null;
        ResultSet rs = null;
        String[] res = null;

        try {
            conn = DriverManager.getConnection(DATASOURCE);

            stat = conn.prepareStatement(q);
            stat.setString(1, keyname);
            stat.setString(2, appid);

            rs = stat.executeQuery();
            while (rs.next()) {
                res = new String[] { rs.getString("token"), rs.getString("secret") };
                break;
            }
        } catch(SQLException e) {
            throw new RuntimeException(e);
        } finally {
            try { rs.close(); } catch(Exception e) { }
            try { stat.close(); } catch(Exception e) { }
            try { conn.close(); } catch(Exception e) { }
        }
        
        return res;
    }

    public List<Map<String,String>> get_full_keys(String appid) {
    	if (!active) throw new RuntimeException(ERROR_MSG);

        String q = "SELECT key_id, token, secret FROM " + _table_name + 
            " WHERE app_id = ?;";
                
        Connection conn = null;
        PreparedStatement stat = null;
        ResultSet rs = null;
        ArrayList<Map<String,String>> list = new ArrayList<Map<String,String>>();

        try {
            conn = DriverManager.getConnection(DATASOURCE);

            stat = conn.prepareStatement(q);
            stat.setString(1, appid);

            rs = stat.executeQuery();

            while (rs.next()) {
                Map<String,String> key = new HashMap<String,String>();
                key.put("key_id", rs.getString("key_id"));
                key.put("token", rs.getString("token"));
                key.put("secret", rs.getString("secret"));
                list.add(key);
            }

        } catch(SQLException e) {
            throw new RuntimeException(e);
        } finally {
            try { rs.close(); } catch(Exception e) { }
            try { stat.close(); } catch(Exception e) { }
            try { conn.close(); } catch(Exception e) { }
        }
        
        return list;
    }
    
    public List<String> get_keys(String appid) {
    	if (!active) throw new RuntimeException(ERROR_MSG);

        String q = "SELECT key_id FROM " + _table_name + " WHERE app_id = ?;";
                
        Connection conn = null;
        PreparedStatement stat = null;
        ResultSet rs = null;
        ArrayList<String> list = new ArrayList<String>();

        try {
            conn = DriverManager.getConnection(DATASOURCE);

            stat = conn.prepareStatement(q);
            stat.setString(1, appid);

            rs = stat.executeQuery();

            while (rs.next()) {
                list.add(rs.getString("key_id"));
            }
        } catch(SQLException e) {
            throw new RuntimeException(e);
        } finally {
            try { rs.close(); } catch(Exception e) { }
            try { stat.close(); } catch(Exception e) { }
            try { conn.close(); } catch(Exception e) { }
        }
        
        return list;
    }
    
    // ---------------------- private -----------------------------------
    
    private void insert_key(String keyname, String appid, String token,
                            String secret) {

    	if (!active) throw new RuntimeException(ERROR_MSG);

        // new apporach:
        //  - select keyname/appid
        // insert into "acre_keystore_x" (key_id, app_id, token, secret) 
        //   select "freebase.com", "/user/alexbl/scratch2", "xxx", "" where 
        //   (select count(*) from acre_keystore_x where key_id="freebase.com")<100;
        // If the key already exists, catch the error and run an update


        Connection conn = null;
        PreparedStatement insert_stat = null;
        PreparedStatement update_stat = null;

        try {
            conn = DriverManager.getConnection(DATASOURCE);

            insert_stat = conn.prepareStatement("INSERT INTO "+ _table_name +
                                                " (key_id, app_id, token, secret) "+
                                                " SELECT ?, ?, ?, ? FROM DUAL "+
                                                "WHERE (SELECT COUNT(*) FROM "
                                                + _table_name +
                                                " WHERE app_id=?)<100;");
            insert_stat.setString(1, keyname);
            insert_stat.setString(2, appid);
            insert_stat.setString(3, token);
            insert_stat.setString(4, secret);
            insert_stat.setString(5, appid);

            conn.setAutoCommit(true);
            int rows = insert_stat.executeUpdate();
            conn.setAutoCommit(false);

            if (rows == 0) {
                throw new RuntimeException("Quota exceeded. Only 100 keys allowed.");
            }
        } catch (SQLException e) {
            try {
                update_stat = conn.prepareStatement("UPDATE "+ _table_name +
                                                    " SET token=?, secret=? "+
                                                    "WHERE key_id=? AND app_id=?;"
                                                    );
                update_stat.setString(1, token);
                update_stat.setString(2, secret);
                update_stat.setString(3, keyname);
                update_stat.setString(4, appid);
                
                conn.setAutoCommit(true);
                int rows = update_stat.executeUpdate();
                conn.setAutoCommit(false);
                if (rows == 0) {
                    throw new RuntimeException("Failed to update key correctly");
                }
            } catch (SQLException e2) {
                throw new RuntimeException(e);
            }
        } finally {
            try { insert_stat.close(); } catch(Exception e) { }
            try {
                if (update_stat != null) update_stat.close(); 
            } catch(Exception e) { }
            try { conn.close(); } catch(Exception e) { }
        }
    }
}

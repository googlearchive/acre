
import java.io.IOException;

import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.conn.scheme.Scheme;
import org.apache.http.conn.scheme.SchemeRegistry;
import org.apache.http.conn.ssl.SSLSocketFactory;
import org.apache.http.impl.client.DefaultHttpClient;

import org.apache.log4j.BasicConfigurator;

public class TestHTTPS {

    public final static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: ./acre test_https <url>");
            System.exit(1);
        }

        BasicConfigurator.configure();

        String url = args[0];
        HttpClient client = new DefaultHttpClient();

        try {
            System.out.println("====> regular status: " + call(client, url));
        } catch (Exception e) {
            System.out.println("====> regular status: ERROR [" + e.getMessage() + "]");
            try {
                System.out.println("====> wrapped status: " + call(wrap(client), url));
            } catch (Exception ee) {
                System.out.println("====> wrapped status: ERROR [" + ee.getMessage() + "]");
            }
        }
        
        client.getConnectionManager().shutdown();
    }

    public static String call(HttpClient client, String url) throws IOException {
        HttpGet httpget = new HttpGet(url);
        HttpResponse response = client.execute(httpget);
        return response.getStatusLine().toString();
    }
    
    public static HttpClient wrap(HttpClient base) {
        try {
            SSLContext ctx = SSLContext.getInstance("TLS");
            X509TrustManager tm = new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] xcs, String string) throws CertificateException {
                }
                public void checkServerTrusted(X509Certificate[] xcs, String string) throws CertificateException {
                }
                public X509Certificate[] getAcceptedIssuers() {
                    return null;
                }
            };
            ctx.init(null, new TrustManager[]{tm}, null);
            SSLSocketFactory ssf = new SSLSocketFactory(ctx);
            ssf.setHostnameVerifier(SSLSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);
            ClientConnectionManager ccm = base.getConnectionManager();
            SchemeRegistry sr = ccm.getSchemeRegistry();
            sr.register(new Scheme("https", ssf, 443));
            return new DefaultHttpClient(ccm, base.getParams());
        } catch (Exception ex) {
            ex.printStackTrace();
            return null;
        }
    }

}

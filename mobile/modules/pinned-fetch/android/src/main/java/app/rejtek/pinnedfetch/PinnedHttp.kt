package app.rejtek.pinnedfetch

import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.X509TrustManager

internal class CertificatePinMismatch : CertificateException("Certificate does not match the pinned fingerprint")

internal data class PinnedResponse(val status: Int, val body: String)

internal object PinnedHttp {
  fun execute(options: RequestOptions): PinnedResponse {
    val url = URL(options.url)
    require(url.protocol == "https") { "Only https URLs can be pinned" }

    val connection = url.openConnection() as HttpsURLConnection
    try {
      val tls = SSLContext.getInstance("TLS")
      tls.init(null, arrayOf(PinnedTrustManager(parseFingerprint(options.fingerprint))), null)
      connection.sslSocketFactory = tls.socketFactory
      // The pinned certificate is the server's identity, so the host name (often a LAN IP
      // that may change) is not checked separately.
      connection.hostnameVerifier = javax.net.ssl.HostnameVerifier { _, _ -> true }
      connection.connectTimeout = options.timeoutMs
      connection.readTimeout = options.timeoutMs
      connection.requestMethod = options.method
      connection.useCaches = false
      options.headers.forEach { (name, value) -> connection.setRequestProperty(name, value) }

      options.body?.let { body ->
        connection.doOutput = true
        connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
      }

      val status = connection.responseCode
      val stream = if (status >= HttpURLConnection.HTTP_BAD_REQUEST) connection.errorStream else connection.inputStream
      val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
      return PinnedResponse(status, body)
    } finally {
      connection.disconnect()
    }
  }

  private fun parseFingerprint(fingerprint: String): ByteArray {
    val hex = fingerprint.replace(":", "").lowercase()
    require(hex.length == 64 && hex.all { it in '0'..'9' || it in 'a'..'f' }) { "Invalid SHA-256 fingerprint" }
    return hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
  }
}

/** Accepts the server only if its leaf certificate's SHA-256 equals the pinned fingerprint. */
private class PinnedTrustManager(private val expected: ByteArray) : X509TrustManager {
  override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
    val leaf = chain.firstOrNull() ?: throw CertificateException("Empty certificate chain")
    val actual = MessageDigest.getInstance("SHA-256").digest(leaf.encoded)
    if (!MessageDigest.isEqual(actual, expected)) {
      throw CertificatePinMismatch()
    }
  }

  override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
    throw CertificateException("Client certificates are not supported")
  }

  override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
}

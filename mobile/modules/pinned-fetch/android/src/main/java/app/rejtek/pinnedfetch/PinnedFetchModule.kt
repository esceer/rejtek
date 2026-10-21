package app.rejtek.pinnedfetch

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class RequestOptions : Record {
  @Field val url: String = ""
  @Field val method: String = "GET"
  @Field val headers: Map<String, String> = emptyMap()
  @Field val body: String? = null
  /** SHA-256 of the server certificate, as colon-separated hex (from the pairing QR code). */
  @Field val fingerprint: String = ""
  @Field val timeoutMs: Int = 5_000
}

class CertificateMismatchException :
  CodedException("ERR_CERT_MISMATCH", "The server certificate does not match the paired server", null)

class NetworkException(cause: Throwable) :
  CodedException("ERR_NETWORK", cause.message ?: "Network request failed", cause)

/**
 * HTTPS requests that trust exactly one certificate: the one whose fingerprint the device
 * learned during pairing. Used because the home server's certificate is self-signed.
 */
class PinnedFetchModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PinnedFetch")

    // Runs on Expo's background queue, so blocking I/O is fine here.
    AsyncFunction("request") { options: RequestOptions ->
      try {
        PinnedHttp.execute(options).let { mapOf("status" to it.status, "body" to it.body) }
      } catch (error: CertificatePinMismatch) {
        throw CertificateMismatchException()
      } catch (error: java.io.IOException) {
        if (error.causes().any { it is CertificatePinMismatch }) throw CertificateMismatchException()
        throw NetworkException(error)
      }
    }
  }
}

private fun Throwable.causes(): Sequence<Throwable> = generateSequence(this) { it.cause }

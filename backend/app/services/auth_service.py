import base64
import hashlib
import hmac
import os

# Parametros de hash
ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 120_000
SALT_BYTES = 16


# Gera hash de senha
def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Senha não pode ser vazia.")
    salt = os.urandom(SALT_BYTES)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    salt_b64 = base64.b64encode(salt).decode("ascii")
    hash_b64 = base64.b64encode(derived).decode("ascii")
    return f"{ALGORITHM}${ITERATIONS}${salt_b64}${hash_b64}"


# Valida senha informada
def verify_password(stored: str | None, password: str) -> bool:
    if not stored or not password:
        return False

    if "$" not in stored:
        return hmac.compare_digest(stored, password)

    parts = stored.split("$")
    if len(parts) != 4:
        return False

    algo, iter_s, salt_b64, hash_b64 = parts
    if algo != ALGORITHM:
        return False

    try:
        iterations = int(iter_s)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except (ValueError, TypeError):
        return False

    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations, dklen=len(expected)
    )
    return hmac.compare_digest(derived, expected)

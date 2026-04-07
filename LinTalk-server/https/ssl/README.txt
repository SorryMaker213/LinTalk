Place your TLS certificate files in this directory:

- cert.pem  (certificate chain)
- cert.key  (private key)

Nginx in compose mounts this folder to /etc/nginx/ssl.
If either file is missing, the nginx container will fail to start.

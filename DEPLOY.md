# LinTalk Deployment Entry (Unified)

Use only the root compose file to deploy:

```bash
cd /home/ubuntu/LinTalk
docker compose up -d --build
```

Do not use `LinTalk-server/https/docker-compose.yml` as an entry file anymore.

## Required files

- `./.env`
- `./LinTalk-server/https/nginx.conf`
- `./LinTalk-server/https/ssl/cert.pem`
- `./LinTalk-server/https/ssl/cert.key`

## Useful checks

```bash
cd /home/ubuntu/LinTalk
docker compose config
docker compose ps
docker compose logs -f nginx lintalk-server lintalk-web mysql
```

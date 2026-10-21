# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml).

FROM node:24-alpine AS web
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY web/package.json web/
RUN npm ci --ignore-scripts
COPY packages/core/ packages/core/
COPY web/ web/
RUN npm run build -w @rejtek/web

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS server
WORKDIR /src
COPY server/global.json server/Directory.Build.props server/Directory.Packages.props ./
COPY server/src/Rejtek.Server/Rejtek.Server.csproj src/Rejtek.Server/
RUN dotnet restore src/Rejtek.Server/Rejtek.Server.csproj
COPY server/src/ src/
COPY --from=web /repo/web/dist/ src/Rejtek.Server/wwwroot/
RUN dotnet publish src/Rejtek.Server/Rejtek.Server.csproj -c Release -o /app --no-restore \
 && mkdir /data

# Chiseled: minimal, no shell or package manager, runs as non-root.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled
WORKDIR /app
COPY --from=server --chown=$APP_UID:$APP_UID /data /data
COPY --from=server /app .
ENV Tls__Enabled=true \
    ASPNETCORE_HTTP_PORTS=""
EXPOSE 8443
VOLUME /data
USER $APP_UID
ENTRYPOINT ["dotnet", "Rejtek.Server.dll"]

# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/Rejtek.Server/Rejtek.Server.csproj src/Rejtek.Server/
RUN dotnet restore src/Rejtek.Server/Rejtek.Server.csproj
COPY src/ src/
RUN dotnet publish src/Rejtek.Server/Rejtek.Server.csproj -c Release -o /app --no-restore \
 && mkdir /data

# Chiseled: minimal, no shell or package manager, runs as non-root.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled
WORKDIR /app
COPY --from=build --chown=$APP_UID:$APP_UID /data /data
COPY --from=build /app .
ENV Tls__Enabled=true \
    ASPNETCORE_HTTP_PORTS=""
EXPOSE 8443
VOLUME /data
USER $APP_UID
ENTRYPOINT ["dotnet", "Rejtek.Server.dll"]

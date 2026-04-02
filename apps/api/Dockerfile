# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY FieldMind.Api.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 fieldmind && \
    adduser --system --uid 1001 --ingroup fieldmind fieldmind

COPY --from=build /app/publish .

RUN chown -R fieldmind:fieldmind /app
USER fieldmind

ENV ASPNETCORE_URLS=http://+:3001
EXPOSE 3001

ENTRYPOINT ["dotnet", "FieldMind.Api.dll"]

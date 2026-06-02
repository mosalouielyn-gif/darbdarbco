#!/usr/bin/env bash
set -e

php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan storage:link || true
php artisan optimize || true

exec apache2-foreground
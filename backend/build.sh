#!/usr/bin/env bash
# Exit on error
set -o errexit

echo ">>> Upgrading pip and installing production requirements..."
pip install --upgrade pip
pip install -r requirements.txt

echo ">>> Collecting static files..."
python manage.py collectstatic --no-input

echo ">>> Applying database migrations..."
python manage.py migrate

echo ">>> Seeding initial Aster Vale village simulation state..."
python manage.py seed_village

echo ">>> Backend deployment build completed successfully!"

#!/bin/sh
# Donne au compte de service d'exécution des Cloud Functions (compte Compute Engine par défaut)
# l'accès à Firestore. À lancer une fois par le propriétaire du projet : sh tools/grant_runtime_sa.sh
set -e
PROJECT=gouvernement-qcm
SA="serviceAccount:628990126729-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT" --member="$SA" --role=roles/datastore.user --condition=None
echo "OK : roles/datastore.user accordé à $SA"

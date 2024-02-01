"""
This file connects with CloudMyDC Jelastic API and adds/updates application manifests defined in the repository.
"""

import os
import requests
import yaml
import logging
from urllib.parse import urlencode

# Initialize logging
logging.basicConfig(level=logging.INFO)

# Constants and Environment Variables
JELASTIC_TOKEN = os.environ.get("JELASTIC_TOKEN")
if not JELASTIC_TOKEN:
    logging.error("JELASTIC_TOKEN not set.")
    exit(1)

JELASTIC_BASE_URL = "https://jca.xapp.cloudmydc.com/1.0/marketplace/admin/rest"


def url(path, params=None, add_session=True):
    """
    Generate a full URL for a given API path and parameters.
    """
    if params is None:
        params = {}

    if add_session:
        params["session"] = JELASTIC_TOKEN

    query_string = urlencode(params)
    return f"{JELASTIC_BASE_URL}/{path}?{query_string}"


def get_apps():
    """
    Get all applications from the Jelastic account.
    """
    try:
        response = requests.get(url("getapps", {"appid": "cluster"}))
        response.raise_for_status()
        logging.info("Fetched apps from Jelastic.")
        return response.json().get("apps", [])
    except requests.RequestException as e:
        logging.error(f"Error fetching apps: {e}")
        return []


def get_local_manifests():
    """
    Get all the application manifests from the repository.
    """
    manifests = []
    for root, dirs, files in os.walk("."):
        if ".git" in dirs:
            dirs.remove(".git")  # ignore git directory
        for file in files:
            if file.endswith(".jps"):
                manifests.append(os.path.join(root, file))

    logging.info(f"Found {len(manifests)} manifests in the repository.")
    return manifests


def add_app(app_id, app_manifest, publish=True, id=None):
    """
    Add or update an application in the Jelastic account.

    :param app_id: ID of the application.
    :param app_manifest: Path to the manifest file.
    :param publish: Whether to publish the application.
    :param id: ID of the application if updating.
    :return: None
    """
    if not publish and not id:
        raise ValueError("ID must be provided when updating an application.")

    if id and not isinstance(id, int):
        raise TypeError("ID must be an integer.")

    logging.info(f"{'Adding' if publish else 'Updating'} application [{app_id}]")

    data = open(app_manifest).read()

    payload = {
        "appid": "cluster",
        "manifest": data,
        "session": JELASTIC_TOKEN,
    }

    if publish:
        api_path = "addapp"
    else:
        payload["id"] = id
        api_path = "editapp"

    try:
        response = requests.post(url(api_path, add_session=False), data=payload)
        if response.json().get("result") != 0:
            raise Exception(response.json().get("error"))

        if publish:
            # Fetch the ID of the newly added application
            for app in get_apps():
                if app["app_id"] == app_id:
                    id = app["id"]
                    break

            logging.info(f"Publishing [{app_id}] application...")
            publish_response = requests.post(
                url("publishapp", {"id": id, "appid": "cluster"})
            )
            if publish_response.json().get("result") != 0:
                raise Exception(publish_response.json().get("error"))
    except requests.RequestException as e:
        logging.error(f"Error in {'adding' if publish else 'updating'} app: {e}")


def process_manifest(manifest, remote_apps):
    """
    Process each manifest file.
    """
    with open(manifest) as f:
        data = yaml.safe_load(f)

    app_id = data["id"]
    app_exists = False
    id = None

    for app in remote_apps:
        if app["app_id"] == app_id:
            app_exists = True
            id = app["id"]
            break

    add_app(app_id, manifest, publish=not app_exists, id=id)


# Main Script Execution
try:
    remote_apps = get_apps()
    local_manifests = get_local_manifests()

    for manifest in local_manifests:
        process_manifest(manifest, remote_apps)
except Exception as e:
    logging.error(f"An error occurred: {e}")

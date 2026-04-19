from flask import jsonify


def success_response(data=None, message="", status_code=200):
    return (
        jsonify(
            {
                "status": "success",
                "data": data or {},
                "message": message,
            }
        ),
        status_code,
    )


def error_response(message="", status_code=400, data=None):
    return (
        jsonify(
            {
                "status": "error",
                "data": data or {},
                "message": message,
            }
        ),
        status_code,
    )
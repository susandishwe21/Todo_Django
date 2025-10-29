# config/utils.py

from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.response import Response
from django.http import Http404

def custom_exception_handler(exc, context):
    # Call DRF's default handler first
    response = exception_handler(exc, context)

    # Check for 404 errors raised by the ModelViewSet (due to object not found)
    if response is not None and response.status_code == 404:
        
        # Check for the core object-not-found exception
        if isinstance(exc, Http404):
            return Response(
                {
                    "message": "Data not Found", # <-- Custom 404 message
                    "status_code": 404
                },
                status=status.HTTP_404_NOT_FOUND
            )

    # For all other exceptions (including 500s, 400s, etc.), use the standard response.
    return response
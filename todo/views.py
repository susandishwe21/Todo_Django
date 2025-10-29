# from django.shortcuts import render
# from rest_framework import viewsets
# from .models import TodoItem
# from .serializers import TodoItemSerializer
# # Create your views here.

# class TodoItemViewSet(viewsets.ModelViewSet):
#     queryset = TodoItem.objects.all().order_by('-created_at')
#     serializer_class = TodoItemSerializer
   # todo/views.py

from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import TodoItem
from .serializers import TodoItemSerializer
from django.shortcuts import get_object_or_404 # Helpful for retrieve/update if needed

class TodoItemViewSet(viewsets.ModelViewSet):
    queryset = TodoItem.objects.all().order_by('-created_at')
    serializer_class = TodoItemSerializer

    # --------------------------------------------------------
    # 1. Custom LIST (GET /api/todos/)
    # Returns ALL todo items wrapped in the custom format.
    # --------------------------------------------------------
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # 1. Apply pagination logic
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            # --- Pagination is Active and Applied ---
            
            # If the paginator returns a page object, we serialize it
            serializer = self.get_serializer(page, many=True)
            
            # If the requested page is valid but empty (e.g., page 3 of 2 pages),
            # DRF's paginator will often handle the empty state, but we ensure
            # the status code is 200 OK regardless.
            
            return Response({
                "message": "success",
                "todo_data": serializer.data, # This will be [] if the page is empty
                
                # Include pagination metadata
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            }, status=status.HTTP_200_OK) # Always return 200 OK
            
        # --- Pagination is NOT Active (or globally disabled) ---
        
        # Serialize the entire queryset
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "message": "success",
            "todo_data": serializer.data 
        }, status=status.HTTP_200_OK)


    # --------------------------------------------------------
    # 2. Custom RETRIEVE (GET /api/todos/{id}/)
    # Returns a single todo item wrapped in the custom format.
    # --------------------------------------------------------
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Serialize the single object
        serializer = self.get_serializer(instance)

        # Build the custom response structure (note: todo_data is an array of one item)
        return Response({
            "message": "success",
            "todo_data": [serializer.data] 
        }, status=status.HTTP_200_OK)


    # --------------------------------------------------------
    # 3. Custom UPDATE (PUT/PATCH /api/todos/{id}/)
    # Returns the updated item wrapped in the custom format.
    # --------------------------------------------------------
    def update(self, request, *args, **kwargs):
        # Retrieve the existing object
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Perform validation and update
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied, we need to refresh the
            # instance to prevent race conditions with the database.
            instance = self.get_object()
            serializer = self.get_serializer(instance)

        # Build the custom response structure (200 OK for successful update)
        return Response({
            "message": "success",
            "todo_data": [serializer.data]
        }, status=status.HTTP_200_OK)
    
    # 4. Custom CREATE (POST /api/todos/)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return 201 Created and the custom format
        headers = self.get_success_headers(serializer.data)
        return Response({
            "message": "success",
            "todo_data": [serializer.data] # Use array format for consistency
        }, status=status.HTTP_201_CREATED, headers=headers)
    

    # 5. Custom DELETE (DELETE /api/todos/{id}/)
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        
        # Return 204 No Content for a successful deletion
        return Response(status=status.HTTP_204_NO_CONTENT)
from django.db import models

# Create your models here.
class TodoItem(models.Model):
    # The primary key 'id' is created automatically by Django
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

from django.shortcuts import render, redirect
from .models import RegisteredUser
from django.core.files.storage import FileSystemStorage

def register_view(request):
    msg = ''
    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')
        mobile = request.POST.get('mobile')
        password = request.POST.get('password')
        image = request.FILES.get('image')

        # Basic validation
        if not (name and email and mobile and password and image):
            msg = "All fields are required."
        else:
            # Save image manually
            fs = FileSystemStorage()
            filename = fs.save(image.name, image)
            img_url = fs.url(filename)

            # Save user with is_active=False
            RegisteredUser.objects.create(
                name=name,
                email=email,
                mobile=mobile,
                password=password,
                image=filename,
                is_active=False
            )
            msg = "Registered successfully! Wait for admin approval."

    return render(request, 'register.html', {'msg': msg})

from django.utils import timezone

from django.utils import timezone
import pytz

def user_login(request):
    msg = ''
    if request.method == 'POST':
        name = request.POST.get('name')
        password = request.POST.get('password')

        try:
            user = RegisteredUser.objects.get(name=name, password=password)
            if user.is_active:
                # Convert current time to IST
                ist = pytz.timezone('Asia/Kolkata')
                local_time = timezone.now().astimezone(ist)

                # Save user info in session
                request.session['user_id'] = user.id
                request.session['user_name'] = user.name
                request.session['user_image'] = user.image.url  # image URL
                request.session['login_time'] = local_time.strftime('%I:%M:%S %p')

                return redirect('user_homepage')
            else:
                msg = "Your account is not activated yet."
        except RegisteredUser.DoesNotExist:
            msg = "Invalid credentials."

    return render(request, 'user_login.html', {'msg': msg})

def admin_login(request):
    msg = ''
    if request.method == 'POST':
        name = request.POST.get('name')
        password = request.POST.get('password')

        if name == 'admin' and password == 'admin':
            return redirect('admin_home')
        else:
            msg = "Invalid admin credentials."

    return render(request, 'admin_login.html', {'msg': msg})

def admin_home(request):
    return render(request, 'admin_home.html', {
        'pending': RegisteredUser.objects.filter(is_active=False),
    })
    
def admin_dashboard(request):
    users = RegisteredUser.objects.all()
    active_count = users.filter(is_active=True).count()
    pending_count = users.filter(is_active=False).count()
    total_count = users.count() or 1  # widthratio cannot divide by zero
    return render(request, 'admin_dashboard.html', {
        'users': users,
        'active_count': active_count,
        'pending_count': pending_count,
        'total_count': total_count,
    })

def activate_user(request, user_id):
    user = RegisteredUser.objects.get(id=user_id)
    user.is_active = True
    user.save()
    return redirect('admin_dashboard')

def deactivate_user(request, user_id):
    user = RegisteredUser.objects.get(id=user_id)
    user.is_active = False
    user.save()
    return redirect('admin_dashboard')

def delete_user(request, user_id):
    user = RegisteredUser.objects.get(id=user_id)
    user.delete()
    return redirect('admin_dashboard')



def home(request):
    return render(request, 'home.html')

def user_homepage(request):
    if 'user_id' not in request.session:
        # User not logged in, redirect to login page
        return redirect('user_login')

    user_name = request.session.get('user_name')
    user_image = request.session.get('user_image')
    login_time = request.session.get('login_time')

    context = {
        'user_name': user_name,
        'user_image': user_image,
        'login_time': login_time,
    }
    return render(request, 'users/user_homepage.html', context)


def threat_console(request):
    """Analyst-facing multi-model QR threat assessment console."""
    if 'user_id' not in request.session:
        return redirect('user_login')

    context = {
        'user_name': request.session.get('user_name'),
        'user_image': request.session.get('user_image'),
        'login_time': request.session.get('login_time'),
    }
    return render(request, 'users/threat_console.html', context)

def user_logout(request):
    request.session.flush()  # Clears all session data
    return redirect('user_login')



import random
from django.shortcuts import render, redirect
from django.core.mail import send_mail
from django.contrib import messages
from .models import RegisteredUser

otp_storage = {}  # Temporary dictionary to store OTPs

def send_otp(email):
    otp = random.randint(100000, 999999)  # Generate a 6-digit OTP
    otp_storage[email] = otp

    subject = "Password Reset OTP"
    message = f"Your OTP for password reset is: {otp}"
    from_email = "saikumardatapoint1@gmail.com"  # Change this to your email
    send_mail(subject, message, from_email, [email])

    return otp

def forgot_password(request):
    if request.method == "POST":
        email = request.POST.get("email")

        if RegisteredUser.objects.filter(email=email).exists():
            send_otp(email)
            request.session["reset_email"] = email  # Store email in session
            return redirect("verify_otp")
        else:
            messages.error(request, "Email not registered!")

    return render(request, "forgot_password.html")

def verify_otp(request):
    if request.method == "POST":
        otp_entered = request.POST.get("otp")
        email = request.session.get("reset_email")

        if otp_storage.get(email) and str(otp_storage[email]) == otp_entered:
            return redirect("reset_password")
        else:
            messages.error(request, "Invalid OTP!")

    return render(request, "verify_otp.html")

def reset_password(request):
    if request.method == "POST":
        new_password = request.POST.get("new_password")
        email = request.session.get("reset_email")

        if RegisteredUser.objects.filter(email=email).exists():
            user = RegisteredUser.objects.get(email=email)
            user.password = new_password  # Updating password
            user.save()
            messages.success(request, "Password reset successful! Please log in.")
            return redirect("user_login")

    return render(request, "reset_password.html")



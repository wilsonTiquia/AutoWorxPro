const register = async (
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    numberOfCarsOwned
) => {
    try {
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/signup',
            data: {
                firstName,
                lastName,
                email,
                password,
                passwordConfirm,
                numberOfCarsOwned,
            },
        });

        if (res.data.status == 'success') {
            alert('Logged In Successfully');
            window.setTimeout(() => {
                location.assign('/dashboard');
            }, 1500);
        }
    } catch (err) {
        alert(err.response.data.message);
    }
};
document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = document.querySelector('input[name="fname"]').value;
    const lastName = document.querySelector('input[name="lname"]').value;
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const passwordConfirm = document.querySelector(
        'input[name="passwordConfirm"]'
    ).value;

    const numberOfCarsOwned = document.querySelector(
        'select[name="cars"]'
    ).value;

    // You can now use these values as needed
    console.log('First Name:', firstName);
    console.log('Last Name:', lastName);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Password Confirm:', passwordConfirm);

    console.log('Number of cars owned:', numberOfCarsOwned);

    register(
        firstName,
        lastName,
        email,
        password,
        passwordConfirm,
        numberOfCarsOwned
    );
});

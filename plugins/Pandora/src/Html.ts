
export interface LoginResponse {
    user: HTMLInputElement;
    pass: HTMLInputElement;
    submit: HTMLInputElement;
    close: HTMLHeadingElement;
    cont: HTMLDivElement;
}
function loginStyle(legacy = false) {
    const s = document.createElement('style');
    s.innerHTML = `
        @keyframes pandClose {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
                display: none;
            }
        }
        .pand.scrCont {
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            margin: 0px;
            top: 0px;
            left: 0px;
            z-index: 99;
            background-color: rgba(0, 0, 0, 0.7);
            width: 100vw;
            height: 100vh;
            transition-duration: 0.5s;
        }
        .pand.smCont {
            display: block;
            width: 30%;
            height: 40%;
            border-radius: 30px;
            background-color: black;
            text-align: center;
        }
        .pand.email, .pand.pass, .pand.submit {
            display: block;
            position: relative;
            width: 70%;
            height: 15%;
            border-radius: 20px;
            border: 2px solid transparent;
            background-color: rgba(255, 255, 255, 0.2);
            font-size: 1.1em;
            text-indent: 0.5em;
            color: white;
            outline: none;
            transition-duration: 0.5s;
        }
        .pand.email:focus, .pand.pass:focus {
                border: 2px solid white;
        }
        .pand.email:invalid:not(:focus):not(:placeholder-shown), .pand.pass:invalid:not(:focus):not(:placeholder-shown) {
            border: 2px solid red;
        }
        ${legacy ? '.pand.pass.valid ~ .pand.submit' :
                   '.pand.smCont:has(.pand.email:valid):has(.pand.pass:valid) .pand.submit'} {
            background-color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
        }
        .pand.email::placeholder, .pand.pass::placeholder {
            color: gray;
        }
        .pand.email {
            margin: 5% auto 5% auto;
        }
        .pand.pass {
            margin: 0% auto 5% auto;
        }
        .pand.submit {
            margin: auto;
            color: black;
            background-color: rgba(255, 255, 255, 0.4);
            cursor: not-allowed;
        }
        .pand.pHeader {
            color:white;
            margin-bottom: 0px;
        }
        .pand.pExit {
            display: inline-block;
            position: relative;
            text-align: left;
            margin: 2% 0px 0px 2%;
            width: 100%;
            height: 1em;
            color: white;
            cursor: pointer;
        }`;
    return s;
}
export function loginPrompt(legacy = false): LoginResponse {
    const scrCont = document.createElement('div');
    scrCont.className = 'pand scrCont';
    const cont = document.createElement('div');
    cont.className = 'pand smCont';

    const close = document.createElement('h2');
    close.className = 'pand pExit';
    close.innerHTML = '&#10006;';
    const header = document.createElement('h1');
    header.className = 'pand pHeader';
    header.innerHTML = 'Pandora Login';
    const user = document.createElement('input');
    user.type = 'email';
    user.autocomplete = 'email';
    user.className = 'pand email';
    user.placeholder = 'Enter your Pandora account email';
    user.required = true;
    const pass = document.createElement('input');
    pass.type = 'password';
    pass.className = 'pand pass';
    pass.placeholder = 'Enter your Pandora account password';
    pass.minLength = 6;
    pass.required = true;
    const submit = document.createElement('input');
    submit.type = 'submit';
    submit.className = 'pand submit';
    submit.value = 'Log In';

    cont.appendChild(close);
    cont.appendChild(header);
    cont.appendChild(user);
    cont.appendChild(pass);
    cont.appendChild(submit);
    scrCont.appendChild(cont);
    document.body.appendChild(scrCont);
    document.head.appendChild(loginStyle(legacy));
    return {
        user,
        pass,
        submit,
        close,
        cont: scrCont
    }
}
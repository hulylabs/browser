interface NotificationProps {
    message: string;
    type: 'info' | 'error';
}

export default function Notification(props: NotificationProps) {
    const getColor = () => {
        switch (props.type) {
            case 'info':
                return '#1976d2';
            case 'error':
                return '#d32f2f';
        }
    }

    const getTitle = () => {
        switch (props.type) {
            case 'info':
                return 'Information';
            case 'error':
                return 'Error';
        }
    }
    return (
        <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            height: '100vh',
            padding: '20px',
            'text-align': 'center',
            'background-color': '#f5f5f5',
            '-webkit-user-select': 'auto',
            'user-select': 'auto',
        }}>
            <h2 style={{ color: getColor(), 'margin-bottom': '16px' }}>
                {getTitle()}
            </h2>
            <p style={{ 'max-width': '600px', 'line-height': '1.5' }}>
                {props.message}
            </p>
        </div>
    )
};